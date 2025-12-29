
// Basic types for Excalidraw elements
export interface ExcalidrawElement {
    id: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    angle: number;
    strokeColor: string;
    backgroundColor: string;
    fillStyle: string;
    strokeWidth: number;
    strokeStyle: string;
    roughness: number;
    opacity: number;
    groupIds: string[];
    strokeSharpness?: string;
    seed: number;
    version: number;
    versionNonce: number;
    isDeleted: boolean;
    boundElements?: { id: string; type: string }[] | null;
    updated?: number;
    link?: string | null;
    locked?: boolean;
    points?: number[][]; // For arrows/lines
    containerId?: string | null; // For text
    text?: string; // For text
    fontSize?: number;
    fontFamily?: number;
    textAlign?: string;
    verticalAlign?: string;
    baseline?: number;
}

/**
 * Sanitizes Excalidraw elements to prevent rendering errors (Zoom NaN).
 * 
 * Rules:
 * 1. x, y, width, height must be finite numbers
 * 2. width and height must be > 0 (set to 10 if 0/missing)
 * 3. Arrows must have at least 2 points (0,0 and end)
 * 4. Text must have valid containerId if present (remove invalid containerId)
 * 5. Remove elements that are fundamentally broken
 */
export function sanitizeExcalidrawElements(elements: any[]): any[] {
    if (!Array.isArray(elements)) {
        console.error('sanitizeExcalidrawElements: Elements is not an array', elements);
        return [];
    }

    const validIds = new Set(elements.map(el => el?.id).filter(Boolean));
    const sanitized: ExcalidrawElement[] = [];

    for (const el of elements) {
        // 1. Basic Object Validation
        if (!el || typeof el !== 'object') {
            console.warn('Skipping non-object element', el);
            continue;
        }

        // 2. Type Validation
        if (!el.type || typeof el.type !== 'string') {
            console.warn('Skipping element with missing type', el);
            continue;
        }

        // Clone to avoid mutating original
        const newEl = { ...el };

        // 3. Coordinate Validation & Fixing
        // Ensure numbers are finite. if NaN -> 0, if Infinity -> 0
        const ensureFinite = (val: any, defaultVal = 0) => {
            const n = Number(val);
            return Number.isFinite(n) ? n : defaultVal;
        };

        newEl.x = ensureFinite(newEl.x);
        newEl.y = ensureFinite(newEl.y);

        // Width/Height must be positive (except for linear elements like arrows where bounds are derived from points)
        newEl.width = ensureFinite(newEl.width);
        newEl.height = ensureFinite(newEl.height);

        if (newEl.type !== 'arrow' && newEl.type !== 'line') {
            if (newEl.width <= 0) {
                console.warn(`Fixing element ${newEl.id} width <= 0 (was ${newEl.width}), setting to 10`);
                newEl.width = 10;
            }
            if (newEl.height <= 0) {
                console.warn(`Fixing element ${newEl.id} height <= 0 (was ${newEl.height}), setting to 10`);
                newEl.height = 10;
            }
        }

        // 4. Arrow/Line Points Validation
        if (newEl.type === 'arrow' || newEl.type === 'line') {
            if (!Array.isArray(newEl.points) || newEl.points.length < 2) {
                console.warn(`Fixing arrow ${newEl.id} with invalid points`, newEl.points);
                // Reset to a basic arrow
                newEl.points = [[0, 0], [newEl.width || 100, newEl.height || 100]];
            } else {
                // Ensure all points are valid numbers
                newEl.points = newEl.points.map((pt: any) => {
                    if (!Array.isArray(pt) || pt.length < 2) return [0, 0];
                    return [ensureFinite(pt[0]), ensureFinite(pt[1])];
                });
            }
        }

        // 5. Text Container Validation
        if (newEl.type === 'text') {
            if (newEl.containerId && !validIds.has(newEl.containerId)) {
                console.warn(`Removing orphan containerId ${newEl.containerId} from text ${newEl.id}`);
                newEl.containerId = null;
                // If text relies on container for positioning, it might be misplaced now, 
                // but at least it won't crash the renderer looking for a non-existent bound.
            }
        }

        // 6. Ensure Required Fields (Fix #1 from User Request)
        if (!newEl.id) newEl.id = `gen-${Math.random().toString(36).substr(2, 9)}`;
        if (typeof newEl.version !== 'number') newEl.version = 1;
        if (typeof newEl.versionNonce !== 'number') newEl.versionNonce = 0;
        if (typeof newEl.isDeleted !== 'boolean') newEl.isDeleted = false;
        if (!Array.isArray(newEl.groupIds)) newEl.groupIds = [];
        if (newEl.frameId === undefined) newEl.frameId = null;
        if (!Array.isArray(newEl.boundElements)) newEl.boundElements = [];
        if (typeof newEl.updated !== 'number') newEl.updated = Date.now();
        if (typeof newEl.seed !== 'number') newEl.seed = Math.floor(Math.random() * 2147483647);
        if (typeof newEl.opacity !== 'number') newEl.opacity = 100;
        if (newEl.link === undefined) newEl.link = null;
        if (typeof newEl.locked !== 'boolean') newEl.locked = false;

        // 9. Ensure visibility properties
        if (!newEl.strokeColor) newEl.strokeColor = '#000000';
        if (!newEl.backgroundColor) newEl.backgroundColor = 'transparent';

        // 10. Fix bound elements (critical for arrows)
        if (Array.isArray(newEl.boundElements)) {
            newEl.boundElements = newEl.boundElements.filter((b: any) => b && b.id && validIds.has(b.id));
        }

        // 11. Fix bindings
        if (newEl.startBinding) {
            if (!validIds.has(newEl.startBinding.elementId)) newEl.startBinding = null;
        }
        if (newEl.endBinding) {
            if (!validIds.has(newEl.endBinding.elementId)) newEl.endBinding = null;
        }

        sanitized.push(newEl);
    }

    // Double check bounds to prevent "Infinity" validation issues in Excalidraw
    // If scene is completely empty or wildly out of bounds, Excalidraw can still freak out.
    // But individual element sanitization is the primary defense.

    return sanitized;
}

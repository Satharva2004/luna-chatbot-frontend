/**
 * Frontend Integration Example for Excalidraw Flowchart Generation
 * 
 * This file shows how to integrate the Excalidraw flowchart generation
 * into your React/Next.js frontend.
 */

// ============================================
// 1. API Service Functions
// ============================================

/**
 * Generate an Excalidraw flowchart
 * @param {string} prompt - Description of the flowchart
 * @param {object} options - Generation options (style, complexity)
 * @param {string} token - JWT authentication token
 * @returns {Promise<object>} Excalidraw data
 */
export async function generateFlowchart(prompt, options = {}, token) {
    const response = await fetch('http://localhost:5000/api/gemini/excalidraw/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt, options })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate flowchart');
    }

    const data = await response.json();
    return data.data; // Returns the Excalidraw data
}

/**
 * Get a text description of a flowchart
 * @param {string} prompt - Description of the process
 * @param {string} token - JWT authentication token
 * @returns {Promise<string>} Text description
 */
export async function getFlowchartDescription(prompt, token) {
    const response = await fetch('http://localhost:5000/api/gemini/excalidraw/describe', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get description');
    }

    const data = await response.json();
    return data.description;
}

/**
 * Check if the Excalidraw service is healthy
 * @returns {Promise<object>} Health status
 */
export async function checkHealth() {
    const response = await fetch('http://localhost:5000/api/gemini/excalidraw/health');
    return response.json();
}

// ============================================
// 2. React Component Example
// ============================================

import React, { useState } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';

export function FlowchartGenerator() {
    const [prompt, setPrompt] = useState('');
    const [excalidrawData, setExcalidrawData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [description, setDescription] = useState('');

    // Get token from your auth context/localStorage
    const token = localStorage.getItem('authToken');

    const handleGenerateDescription = async () => {
        if (!prompt.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const desc = await getFlowchartDescription(prompt, token);
            setDescription(desc);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateFlowchart = async () => {
        if (!prompt.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const data = await generateFlowchart(
                prompt,
                { style: 'modern', complexity: 'detailed' },
                token
            );
            setExcalidrawData(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1>AI Flowchart Generator</h1>

            {/* Input Section */}
            <div style={{ marginBottom: '20px' }}>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe your flowchart... (e.g., 'User authentication flow with login and signup')"
                    style={{
                        width: '100%',
                        minHeight: '100px',
                        padding: '10px',
                        fontSize: '16px',
                        borderRadius: '8px',
                        border: '1px solid #ccc'
                    }}
                />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button
                    onClick={handleGenerateDescription}
                    disabled={loading || !prompt.trim()}
                    style={{
                        padding: '10px 20px',
                        fontSize: '16px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                >
                    {loading ? 'Loading...' : 'Get Description'}
                </button>

                <button
                    onClick={handleGenerateFlowchart}
                    disabled={loading || !prompt.trim()}
                    style={{
                        padding: '10px 20px',
                        fontSize: '16px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#2196F3',
                        color: 'white',
                        cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                >
                    {loading ? 'Generating...' : 'Generate Flowchart'}
                </button>
            </div>

            {/* Error Display */}
            {error && (
                <div style={{
                    padding: '10px',
                    marginBottom: '20px',
                    backgroundColor: '#ffebee',
                    color: '#c62828',
                    borderRadius: '8px'
                }}>
                    Error: {error}
                </div>
            )}

            {/* Description Display */}
            {description && (
                <div style={{
                    padding: '15px',
                    marginBottom: '20px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '8px',
                    whiteSpace: 'pre-wrap'
                }}>
                    <h3>Flowchart Description:</h3>
                    <p>{description}</p>
                </div>
            )}

            {/* Excalidraw Canvas */}
            {excalidrawData && (
                <div style={{ height: '600px', border: '1px solid #ccc', borderRadius: '8px' }}>
                    <Excalidraw
                        initialData={{
                            elements: excalidrawData.elements,
                            appState: excalidrawData.appState
                        }}
                    />
                </div>
            )}

            {/* Example Prompts */}
            {!excalidrawData && (
                <div style={{ marginTop: '30px' }}>
                    <h3>Example Prompts:</h3>
                    <ul style={{ lineHeight: '1.8' }}>
                        <li>User authentication flow with login, signup, and password reset</li>
                        <li>E-commerce checkout process from cart to delivery</li>
                        <li>CI/CD pipeline with testing, building, and deployment</li>
                        <li>Customer support ticket lifecycle</li>
                        <li>Data processing workflow with validation and storage</li>
                    </ul>
                </div>
            )}
        </div>
    );
}

// ============================================
// 3. Usage in Next.js Page
// ============================================

// pages/flowchart-generator.tsx
import { FlowchartGenerator } from '@/components/FlowchartGenerator';

export default function FlowchartPage() {
    return (
        <div>
            <FlowchartGenerator />
        </div>
    );
}

// ============================================
// 4. Custom Hook Example
// ============================================

import { useState, useCallback } from 'react';

export function useFlowchartGenerator() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [flowchart, setFlowchart] = useState(null);

    const generate = useCallback(async (prompt, options = {}) => {
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('authToken');
            const data = await generateFlowchart(prompt, options, token);
            setFlowchart(data);
            return data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const reset = useCallback(() => {
        setFlowchart(null);
        setError(null);
    }, []);

    return {
        flowchart,
        loading,
        error,
        generate,
        reset
    };
}

// Usage:
// const { flowchart, loading, error, generate } = useFlowchartGenerator();
// await generate('User login flow');

// ============================================
// 5. TypeScript Types (Optional)
// ============================================

export interface ExcalidrawElement {
    id: string;
    type: 'rectangle' | 'ellipse' | 'diamond' | 'text' | 'arrow' | 'line';
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
    frameId: string | null;
    roundness: { type: number } | null;
    seed: number;
    version: number;
    versionNonce: number;
    isDeleted: boolean;
    boundElements?: Array<{ id: string; type: string }>;
    text?: string;
    fontSize?: number;
    fontFamily?: number;
    textAlign?: string;
    verticalAlign?: string;
    containerId?: string;
    originalText?: string;
}

export interface ExcalidrawData {
    type: 'excalidraw';
    version: number;
    source: string;
    elements: ExcalidrawElement[];
    appState: {
        gridSize: number | null;
        viewBackgroundColor: string;
    };
    files: Record<string, any>;
}

export interface FlowchartOptions {
    style?: 'minimal' | 'modern' | 'detailed';
    complexity?: 'simple' | 'moderate' | 'detailed';
}

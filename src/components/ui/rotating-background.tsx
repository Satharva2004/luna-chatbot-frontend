"use client"

import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

type RotatingBackgroundProps = {
  images: string[]
  interval?: number
  alt?: string
  className?: string
}

export function RotatingBackground({
  images,
  interval = 10000,
  alt = "Background",
  className,
}: RotatingBackgroundProps) {
  // Start with 0 to avoid hydration mismatch (server and client will match)
  const [index, setIndex] = useState(0)
  const [isMounted, setIsMounted] = useState(false)

  // Set mounted flag after client-side hydration
  useEffect(() => {
    setIsMounted(true)
    // Set random initial image only on client side
    if (images.length > 0) {
      setIndex(Math.floor(Math.random() * images.length))
    }
  }, [images.length])

  useEffect(() => {
    if (!isMounted || images.length <= 1) return

    const id = window.setInterval(() => {
      setIndex((prev) => {
        if (images.length <= 1) {
          return prev
        }

        let next = prev
        while (next === prev) {
          next = Math.floor(Math.random() * images.length)
        }

        return next
      })
    }, interval)

    return () => window.clearInterval(id)
  }, [images, interval, isMounted])

  if (!images.length) {
    return null
  }

  const currentImage = images[index] ?? images[0]

  return (
    <img
      src={currentImage}
      alt={alt}
      className={cn(
        "absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
        className
      )}
    />
  )
}

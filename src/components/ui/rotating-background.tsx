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
  const [index, setIndex] = useState(() =>
    images.length > 0 ? Math.floor(Math.random() * images.length) : 0
  )

  useEffect(() => {
    if (images.length <= 1) return

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
  }, [images, interval])

  useEffect(() => {
    if (!images.length) {
      setIndex(0)
      return
    }

    setIndex(Math.floor(Math.random() * images.length))
  }, [images])

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

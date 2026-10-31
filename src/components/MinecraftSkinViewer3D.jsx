import React, { useEffect, useRef } from 'react'
import { SkinViewer, WalkingAnimation, FlyingAnimation, IdleAnimation } from 'skinview3d'

export default function MinecraftSkinViewer3D({
  skinUrl,
  model = 'classic', // 'classic' | 'slim'
  width = 240,
  height = 360,
  animation = 'idle', // 'idle' | 'walk' | 'fly' | 'none'
  fov = 70,
  enableRotate = true,
}) {
  const canvasRef = useRef(null)
  const viewerRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return

    // Initialize skinview3d viewer
    const viewer = new SkinViewer({
      canvas: canvasRef.current,
      width: width,
      height: height,
      skin: skinUrl,
      model: model === 'slim' ? 'slim' : 'default',
    })

    viewer.fov = fov
    viewer.zoom = 0.85
    viewer.autoRotate = false
    viewer.controls.enableRotate = enableRotate
    viewer.controls.enableZoom = false
    viewer.controls.enablePan = false

    // Set animation
    let anim = null
    if (animation === 'idle') {
      anim = viewer.animations.add(IdleAnimation)
      anim.speed = 0.8
    } else if (animation === 'walk') {
      anim = viewer.animations.add(WalkingAnimation)
      anim.speed = 0.6
    } else if (animation === 'fly') {
      anim = viewer.animations.add(FlyingAnimation)
      anim.speed = 0.5
    }

    viewerRef.current = viewer

    return () => {
      viewer.dispose()
      viewerRef.current = null
    }
  }, [width, height])

  // Update skin texture or model dynamically
  useEffect(() => {
    if (!viewerRef.current) return
    if (skinUrl) {
      viewerRef.current.loadSkin(skinUrl, {
        model: model === 'slim' ? 'slim' : 'default',
      })
    }
  }, [skinUrl, model])

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      <canvas
        ref={canvasRef}
        className="rounded-2xl cursor-grab active:cursor-grabbing drop-shadow-[0_15px_30px_rgba(0,0,0,0.7)]"
      />
      <div className="mt-2 text-[11px] font-medium text-white/40 flex items-center gap-1.5 pointer-events-none">
        <span>Drag to rotate</span>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useRef } from 'react'
import type { Mesh, MeshPhongMaterial } from 'three'

type Object3DType = 'obj' | 'glb' | 'gltf'

interface RoomObject3DProps {
  objectUrl: string | null
  objectType: Object3DType | null
  className?: string
}

export default function RoomObject3D({ objectUrl, objectType, className = '' }: RoomObject3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !objectUrl || !objectType || !containerRef.current) return

    const container = containerRef.current
    let cancelled = false
    let animateId = 0

    const doCleanup = () => {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }

    const init = async () => {
      await new Promise((r) => requestAnimationFrame(r))
      if (cancelled) return
      const w = container.clientWidth || 200
      const h = container.clientHeight || 180
      if (w < 10 || h < 10) return

      const THREE = await import('three')
      const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js')
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')

      if (cancelled) return

      const scene = new THREE.Scene()
      scene.background = null
      const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000)
      camera.position.set(0, 0, 3)
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
      renderer.setSize(w, h)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      container.appendChild(renderer.domElement)

      const ambient = new THREE.AmbientLight(0xffffff, 0.7)
      scene.add(ambient)
      const dir = new THREE.DirectionalLight(0xffffff, 0.8)
      dir.position.set(2, 2, 2)
      scene.add(dir)

      try {
        if (objectType === 'obj') {
          const loader = new OBJLoader()
          const obj = await loader.loadAsync(objectUrl)
          if (cancelled) return
          obj.traverse((child) => {
            if ((child as Mesh).isMesh) {
              const mat = (child as Mesh).material as MeshPhongMaterial
              if (mat?.color) mat.color.setHex(0x818cf8)
            }
          })
          const box = new THREE.Box3().setFromObject(obj)
          const center = box.getCenter(new THREE.Vector3())
          const size = box.getSize(new THREE.Vector3())
          obj.position.sub(center)
          const maxDim = Math.max(size.x, size.y, size.z)
          if (maxDim > 0) obj.scale.multiplyScalar(1.2 / maxDim)
          scene.add(obj)
        } else {
          const loader = new GLTFLoader()
          const gltf = await loader.loadAsync(objectUrl)
          if (cancelled) return
          const model = gltf.scene
          const box = new THREE.Box3().setFromObject(model)
          const center = box.getCenter(new THREE.Vector3())
          const size = box.getSize(new THREE.Vector3())
          model.position.sub(center)
          const maxDim = Math.max(size.x, size.y, size.z)
          if (maxDim > 0) model.scale.multiplyScalar(1.2 / maxDim)
          scene.add(model)
        }
      } catch (err) {
        console.error('Errore caricamento modello 3D:', err)
      }

      const animate = () => {
        animateId = requestAnimationFrame(animate)
        renderer.render(scene, camera)
      }
      animate()

      const onResize = () => {
        if (!container.parentElement) return
        const rw = container.clientWidth || w
        const rh = container.clientHeight || h
        if (rw < 10 || rh < 10) return
        camera.aspect = rw / rh
        camera.updateProjectionMatrix()
        renderer.setSize(rw, rh)
      }
      window.addEventListener('resize', onResize)

      cleanupRef.current = () => {
        window.removeEventListener('resize', onResize)
        cancelAnimationFrame(animateId)
        renderer.dispose()
        if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
      }
    }

    init()
    return () => {
      cancelled = true
      doCleanup()
    }
  }, [objectUrl, objectType])

  if (!objectUrl || !objectType) return null

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: '100%', height: '100%', minWidth: 160, minHeight: 140 }}
    />
  )
}

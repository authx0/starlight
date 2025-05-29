"use client";

import { useEffect, useRef, useState } from "react";

export default function Home() {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <Canvas />
      <Controls />
    </div>
  );
}

// Interactive controls component
function Controls() {
  const [showControls, setShowControls] = useState(true);
  
  // Delay hiding controls after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowControls(false);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div 
      className={`absolute bottom-4 right-4 p-3 bg-black/30 backdrop-blur-md rounded-lg transition-opacity duration-500 ${
        showControls ? "opacity-70" : "opacity-0"
      } hover:opacity-70`}
      onMouseEnter={() => setShowControls(true)}
    >
      <div className="text-white/80 text-sm mb-2 pointer-events-none">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
            <span className="transform -translate-y-0.5">↕</span>
          </div>
          <span>Scroll to zoom</span>
        </div>
        <div className="flex items-center space-x-2 mt-2">
          <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
            <span>↻</span>
          </div>
          <span>Drag to rotate globe</span>
        </div>
      </div>
    </div>
  );
}

// Global state for interactivity with 3D rotation
const interactionState = {
  rotationX: 0,  // Rotation around X-axis (vertical)
  rotationY: 0,  // Rotation around Y-axis (horizontal)
  zoom: 1,
  isDragging: false,
  lastMouseX: 0,
  lastMouseY: 0,
  targetRotationX: 0,
  targetRotationY: 0,
  targetZoom: 1,
};

// 3D point class for globe coordinates
class Point3D {
  x: number;
  y: number;
  z: number;
  color: string;
  radius: number;
  originalX: number;
  originalY: number;
  originalZ: number;
  waveSize: number;
  waveSpeed: number;
  
  constructor(x: number, y: number, z: number, radius: number, color: string) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.originalX = x;
    this.originalY = y;
    this.originalZ = z;
    this.radius = radius;
    this.color = color;
    this.waveSize = Math.random() * 10 + 5;
    this.waveSpeed = Math.random() * 0.02 + 0.01;
  }
  
  // Project 3D point to 2D screen coordinates
  project(centerX: number, centerY: number, zoom: number): {x: number, y: number, size: number} {
    const scale = zoom * 900 / (900 + this.z); // Perspective projection
    const x2d = centerX + this.x * scale;
    const y2d = centerY + this.y * scale;
    const size = Math.max(0.1, this.radius * scale);
    
    return { x: x2d, y: y2d, size };
  }
  
  // Update point position with wave motion
  update(time: number) {
    // Add wave effect to radius
    const waveEffect = Math.sin(time * this.waveSpeed) * this.waveSize;
    
    // Calculate distance from origin
    const distance = Math.sqrt(
      this.originalX * this.originalX + 
      this.originalY * this.originalY + 
      this.originalZ * this.originalZ
    );
    
    // Apply wave motion outward from center
    if (distance > 0) {
      const ratio = (distance + waveEffect) / distance;
      this.x = this.originalX * ratio;
      this.y = this.originalY * ratio;
      this.z = this.originalZ * ratio;
    }
  }
  
  // Rotate the point around X and Y axes
  rotate(angleX: number, angleY: number) {
    // Rotation around Y-axis
    const cosY = Math.cos(angleY);
    const sinY = Math.sin(angleY);
    
    const tempX = this.x * cosY - this.z * sinY;
    const tempZ = this.x * sinY + this.z * cosY;
    
    this.x = tempX;
    this.z = tempZ;
    
    // Rotation around X-axis
    const cosX = Math.cos(angleX);
    const sinX = Math.sin(angleX);
    
    const tempY = this.y * cosX - this.z * sinX;
    const newZ = this.y * sinX + this.z * cosX;
    
    this.y = tempY;
    this.z = newZ;
  }
}

// Client component for the canvas
function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas to full screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Starlights configuration
    const points: Point3D[] = [];
    const particleCount = 600; // More particles for the globe effect
    const radius = Math.min(canvas.width, canvas.height) * 0.3; // Globe radius
    
    const colors = [
      'rgba(255, 255, 255, 0.9)',  // Bright white
      'rgba(255, 255, 255, 0.8)',  // Slightly transparent white
      'rgba(255, 255, 255, 0.7)',  // More transparent white
      'rgba(255, 255, 255, 0.6)',  // Even more transparent white
      'rgba(255, 255, 255, 0.5)',  // Most transparent white
    ];
    
    // Initialize points in a sphere shape
    for (let i = 0; i < particleCount; i++) {
      // Use spherical coordinates to generate points on a sphere surface
      const theta = Math.random() * 2 * Math.PI; // Azimuthal angle
      const phi = Math.acos(2 * Math.random() - 1); // Polar angle
      
      // Convert spherical to cartesian coordinates
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      const pointRadius = Math.random() * 2 + 1;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      points.push(new Point3D(x, y, z, pointRadius, color));
    }

    // Mouse interaction handlers
    const handleMouseDown = (e: MouseEvent) => {
      interactionState.isDragging = true;
      interactionState.lastMouseX = e.clientX;
      interactionState.lastMouseY = e.clientY;
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (interactionState.isDragging) {
        const deltaX = e.clientX - interactionState.lastMouseX;
        const deltaY = e.clientY - interactionState.lastMouseY;
        
        // Update target rotations (note: reversed for intuitive control)
        interactionState.targetRotationY += deltaX * 0.005;
        interactionState.targetRotationX -= deltaY * 0.005;
        
        interactionState.lastMouseX = e.clientX;
        interactionState.lastMouseY = e.clientY;
      }
    };
    
    const handleMouseUp = () => {
      interactionState.isDragging = false;
    };
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Adjust zoom based on wheel direction
      const zoomDelta = -e.deltaY * 0.001;
      interactionState.targetZoom = Math.max(0.5, Math.min(3, interactionState.targetZoom + zoomDelta));
    };
    
    // Add event listeners
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    
    // Touch events for mobile
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        interactionState.isDragging = true;
        interactionState.lastMouseX = e.touches[0].clientX;
        interactionState.lastMouseY = e.touches[0].clientY;
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (interactionState.isDragging && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - interactionState.lastMouseX;
        const deltaY = e.touches[0].clientY - interactionState.lastMouseY;
        
        // Update target rotations for touch
        interactionState.targetRotationY += deltaX * 0.005;
        interactionState.targetRotationX -= deltaY * 0.005;
        
        interactionState.lastMouseX = e.touches[0].clientX;
        interactionState.lastMouseY = e.touches[0].clientY;
      }
    };
    
    const handleTouchEnd = () => {
      interactionState.isDragging = false;
    };
    
    // Add touch event listeners
    canvas.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    let animationFrameId: number;
    let time = 0;

    // Animation function
    const animate = () => {
      time += 0.01;
      
      // Smooth interpolation for rotation and zoom
      interactionState.rotationX += (interactionState.targetRotationX - interactionState.rotationX) * 0.05;
      interactionState.rotationY += (interactionState.targetRotationY - interactionState.rotationY) * 0.05;
      interactionState.zoom += (interactionState.targetZoom - interactionState.zoom) * 0.1;
      
      // Add small auto-rotation when not interacting
      if (!interactionState.isDragging) {
        interactionState.targetRotationY += 0.001;
      }
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Reset all points to their original positions
      points.forEach(p => {
        p.x = p.originalX;
        p.y = p.originalY;
        p.z = p.originalZ;
      });
      
      // Update point positions with wave motion
      points.forEach(point => {
        point.update(time);
      });
      
      // Apply 3D rotation to all points
      points.forEach(point => {
        point.rotate(interactionState.rotationX, interactionState.rotationY);
      });
      
      // Sort points by z-coordinate for proper depth rendering (painter's algorithm)
      const sortedPoints = [...points].sort((a, b) => b.z - a.z);
      
      // Draw starlights particles with size based on z-depth
      sortedPoints.forEach(point => {
        const projected = point.project(centerX, centerY, interactionState.zoom);
        
        // Only draw points in front of the "camera"
        if (point.z < 500) {
          // Calculate brightness based on z-coordinate for depth effect
          const brightness = Math.max(0.2, Math.min(1, (point.z + 300) / 600));
          const color = point.color.replace('0.7', brightness.toString());
          
          // Draw the point
          ctx.beginPath();
          ctx.arc(projected.x, projected.y, projected.size, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          
          // Draw glow for brighter points
          if (brightness > 0.6) {
            ctx.beginPath();
            ctx.arc(projected.x, projected.y, projected.size * 3, 0, Math.PI * 2);
            const gradient = ctx.createRadialGradient(
              projected.x, projected.y, projected.size * 0.5,
              projected.x, projected.y, projected.size * 3
            );
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.fill();
          }
        }
      });
      
      // Draw starlights connections for points close to each other
      ctx.globalAlpha = 0.3;
      sortedPoints.forEach((p1, i) => {
        for (let j = i + 1; j < Math.min(i + 5, sortedPoints.length); j++) {
          const p2 = sortedPoints[j];
          const proj1 = p1.project(centerX, centerY, interactionState.zoom);
          const proj2 = p2.project(centerX, centerY, interactionState.zoom);
          
          // Calculate 3D distance between points
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dz = p1.z - p2.z;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          // Only connect nearby points
          if (distance < radius * 0.25) {
            const opacity = 1 - distance / (radius * 0.25);
            
            // Draw connection line with gradient
            const gradient = ctx.createLinearGradient(
              proj1.x, proj1.y, 
              proj2.x, proj2.y
            );
            gradient.addColorStop(0, p1.color);
            gradient.addColorStop(1, p2.color);
            
            ctx.beginPath();
            ctx.moveTo(proj1.x, proj1.y);
            ctx.lineTo(proj2.x, proj2.y);
            ctx.strokeStyle = gradient;
            ctx.globalAlpha = 0.15 * opacity;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      });
      ctx.globalAlpha = 1;
      
      animationFrameId = requestAnimationFrame(animate);
    };

    // Handle window resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const newCenterX = canvas.width / 2;
      const newCenterY = canvas.height / 2;
      // Update radius based on new dimensions
      const newRadius = Math.min(canvas.width, canvas.height) * 0.3;
      
      // Reset points for new dimensions
      points.forEach((p, i) => {
        // Recalculate spherical coordinates
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        
        // Update original coordinates
        p.originalX = newRadius * Math.sin(phi) * Math.cos(theta);
        p.originalY = newRadius * Math.sin(phi) * Math.sin(theta);
        p.originalZ = newRadius * Math.cos(phi);
        
        // Reset current coordinates
        p.x = p.originalX;
        p.y = p.originalY;
        p.z = p.originalZ;
      });
    };

    window.addEventListener('resize', handleResize);
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('touchstart', handleTouchStart);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />;
}

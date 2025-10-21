/*
Photo Print Customizer - Next.js page (single-file template)

FEATURE UPDATE: Added ability for admin/user to upload custom frame PNGs at runtime.
Uploaded frames are stored in localStorage (so they persist per browser) and shown alongside built-in frames.

INSTRUCTIONS:
1) Put this file under: /pages/photo-customizer.jsx  ✅
2) Add example frame images into public/frames/ if you want built-in frames (optional).
3) Install dependencies:
   npm install react-easy-crop uuid

4) This page posts the final merged image (as a base64 payload) to your WordPress API endpoint defined in environment variable:
   process.env.WP_UPLOAD_ENDPOINT

NOTES:
- Uploaded frames should ideally be PNGs with transparent center.
- Custom frames persist in browser localStorage.
*/

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import { v4 as uuidv4 } from 'uuid';

// ----- Pricing data -----
const priceTable = {
  "Màng Sleeve": {
    "5x7": { "10-15": 1500, "16-40": 1300, "41-100": 900, "101-150": 700, "1000+": 500 },
    "6x9": { "10-15": 1800, "16-40": 1500, "41-100": 1000, "101-150": 800, "1000+": 600 },
  },
  "Ép Plastic": {
    "5x7": { "10-15": 2300, "16-40": 2000, "41-100": 1200, "101-150": 900, "1000+": 600 },
    "6x9": { "10-15": 5000, "16-40": 4000, "41-100": 3800, "101-150": 3500, "1000+": 3000 },
    "9x12": { "10-15": 6600, "16-40": 5900, "41-100": 5300, "101-150": 4900, "1000+": 4200 },
    "10x15": { "10-15": 9000, "16-40": 8000, "41-100": 7300, "101-150": 7000, "1000+": 6000 },
    "13x18": { "10-15": 12000, "16-40": 10800, "41-100": 9300, "101-150": 8300, "1000+": 7300 },
    "15x21": { "10-15": 18500, "16-40": 17800, "41-100": 16300, "101-150": 14300, "1000+": 12500 },
    "21x29 (A4)": { "10-15": 18500, "16-40": 17800, "41-100": 16300, "101-150": 14300, "1000+": 12500 },
  }
};

function findBracket(pricingObj, qty) {
  if (!pricingObj) return null;
  for (const b of Object.keys(pricingObj)) {
    if (b.includes('-')) {
      const [min, max] = b.split('-').map((s) => parseInt(s.trim(), 10));
      if (!isNaN(min) && !isNaN(max) && qty >= min && qty <= max) return pricingObj[b];
    } else if (b.endsWith('+')) {
      const min = parseInt(b.replace('+', ''), 10);
      if (!isNaN(min) && qty >= min) return pricingObj[b];
    }
  }
  return null;
}

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', (err) => reject(err));
    img.setAttribute('crossOrigin', 'anonymous');
    img.src = url;
  });

export default function PhotoCustomizer() {
  const builtInFrames = [
    { id: 'frame-classic', name: 'Classic White', src: '/frames/frame1.png', aspect: 4 / 5 },
    { id: 'frame-polaroid', name: 'Polaroid', src: '/frames/frame2.png', aspect: 1 },
    { id: 'frame-instagram', name: 'Instagram Mockup', src: '/frames/frame3.png', aspect: 1.08 },
  ];

  const [customFrames, setCustomFrames] = useState([]);
  const allFrames = [...builtInFrames, ...customFrames];

  const [imageSrc, setImageSrc] = useState(null);
  const [selectedFrame, setSelectedFrame] = useState(allFrames[0] || null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [group, setGroup] = useState('Màng Sleeve');
  const [size, setSize] = useState(Object.keys(priceTable['Màng Sleeve'])[0]);
  const [quantity, setQuantity] = useState(10);
  const [pricePerPic, setPricePerPic] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('customFrames_v1');
      if (raw) setCustomFrames(JSON.parse(raw));
    } catch (e) {
      console.warn('Failed to load custom frames', e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('customFrames_v1', JSON.stringify(customFrames));
    } catch (e) {
      console.warn('Failed to save custom frames', e);
    }
  }, [customFrames]);

  useEffect(() => {
    const all = [...builtInFrames, ...customFrames];
    if (!selectedFrame && all.length > 0) setSelectedFrame(all[0]);
  }, [customFrames]);

  const onSelectFile = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => setImageSrc(reader.result));
      reader.readAsDataURL(file);
    }
  };

  const onUploadFrame = (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      createImage(dataUrl)
        .then((img) => {
          const newFrame = { id: `custom-${uuidv4()}`, name: file.name, src: dataUrl, aspect: img.width / img.height };
          setCustomFrames((s) => [newFrame, ...s]);
          setSelectedFrame(newFrame);
        })
        .catch(() => {
          const newFrame = { id: `custom-${uuidv4()}`, name: file.name, src: dataUrl, aspect: 1 };
          setCustomFrames((s) => [newFrame, ...s]);
          setSelectedFrame(newFrame);
        });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const generateMergedImage = async (outputWidth = 2000) => {
    if (!imageSrc || !selectedFrame || !croppedAreaPixels) return null;
    try {
      const img = await createImage(imageSrc);
      const frameImg = await createImage(selectedFrame.src);
      const aspect = selectedFrame.aspect || (frameImg.width / frameImg.height) || 1;
      const width = outputWidth;
      const height = Math.max(1, Math.round(outputWidth / aspect));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(
        img,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        width,
        height
      );
      ctx.drawImage(frameImg, 0, 0, width, height);
      return canvas.toDataURL('image/png');
    } catch (err) {
      console.error('Merge failed', err);
      return null;
    }
  };

  const onSubmit = async () => {
    try {
      const base64Data = await generateMergedImage();
      if (!base64Data) return alert('Vui lòng upload ảnh và crop trước khi gửi.');

      const res = await fetch(process.env.WP_UPLOAD_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Data }),
      });

      if (!res.ok) throw new Error('Upload failed');
      alert('Gửi thành công!');
    } catch (err) {
      alert('Có lỗi: ' + err.message);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Upload & Chỉnh ảnh</h2>

      <input type="file" accept="image/*" onChange={onSelectFile} />
      <input type="file" accept="image/*" onChange={onUploadFrame} className="mt-2" />

      <button onClick={onSubmit} className="mt-4 bg-green-600 text-white px-4 py-2 rounded">
        Gửi đặt in
      </button>
    </div>
  );
}
/*
 Photo Print Customizer - Next.js page
*/

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { v4 as uuidv4 } from 'uuid';

export default function PhotoCustomizer() {
  const [image, setImage] = useState(null);
  const [frame, setFrame] = useState(null);
  const [frames, setFrames] = useState([]);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef();

  // ⚙️ Load sẵn vài khung mẫu
  useEffect(() => {
    const builtInFrames = [
      '/frames/frame1.png',
      '/frames/frame2.png',
      '/frames/frame3.png',
    ];
    const stored = JSON.parse(localStorage.getItem('customFrames') || '[]');
    setFrames([...builtInFrames, ...stored]);
  }, []);

  // 📂 Upload hình chính
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) setImage(URL.createObjectURL(file));
  };

  // 📂 Upload khung PNG
  const handleFrameUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const newFrame = reader.result;
      const updatedFrames = [...frames, newFrame];
      setFrames(updatedFrames);
      localStorage.setItem('customFrames', JSON.stringify(updatedFrames));
    };
    reader.readAsDataURL(file);
  };

  // 🎨 Cropper callback
  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // 🧩 Tạo ảnh cuối (merge khung + ảnh)
  const createMergedImage = async () => {
    if (!image || !frame) return alert('Vui lòng chọn ảnh và khung!');
    const img = new Image();
    const frm = new Image();
    img.crossOrigin = 'anonymous';
    frm.crossOrigin = 'anonymous';
    img.src = image;
    frm.src = frame;

    await Promise.all([
      new Promise((res) => (img.onload = res)),
      new Promise((res) => (frm.onload = res)),
    ]);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 800;

    ctx.drawImage(img, 0, 0, 800, 800);
    ctx.drawImage(frm, 0, 0, 800, 800);
    return canvas.toDataURL('image/png');
  };

  // 🚀 Gửi ảnh sang WordPress
  const handleSubmit = async () => {
    try {
      setLoading(true);
      const merged = await createMergedImage();
      const payload = {
        id: uuidv4(),
        image: merged,
        time: new Date().toISOString(),
      };

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) alert('✅ Ảnh đã gửi thành công!');
      else alert('❌ Lỗi gửi ảnh: ' + (data?.error || 'Unknown error'));
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>Upload & Chỉnh ảnh</h2>

      <input type="file" accept="image/*" onChange={handleImageUpload} />
      <input type="file" accept="image/png" onChange={handleFrameUpload} />

      <div style={{ position: 'relative', width: 400, height: 400, margin: '20px auto' }}>
        {image ? (
          <>
            <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
            {frame && (
              <img
                src={frame}
                alt="Frame"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                }}
              />
            )}
          </>
        ) : (
          <p>📷 Hãy chọn 1 tấm ảnh để bắt đầu.</p>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, overflowX: 'auto' }}>
        {frames.map((f, i) => (
          <img
            key={i}
            src={f}
            alt={`Frame ${i}`}
            onClick={() => setFrame(f)}
            style={{
              width: 100,
              height: 100,
              border: f === frame ? '3px solid #0070f3' : '1px solid #ccc',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          />
        ))}
      </div>

      <button onClick={handleSubmit} disabled={loading} style={{ marginTop: 20 }}>
        {loading ? 'Đang gửi...' : 'Gửi đặt in'}
      </button>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}

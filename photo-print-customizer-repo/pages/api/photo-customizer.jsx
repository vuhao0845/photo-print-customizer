/*
Photo Print Customizer - Next.js page (single-file template)

FEATURE UPDATE: Added ability for admin/user to upload custom frame PNGs at runtime.
Uploaded frames are stored in localStorage (so they persist per browser) and shown alongside built-in frames.

INSTRUCTIONS:
1) Put this file under: /app/photo-customizer/page.jsx (Next.js 13+ app router) OR /pages/photo-customizer.jsx for pages router.
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

  const previewCanvasRef = useRef();

  // load + persist frames
  useEffect(() => {
    try {
      const raw = localStorage.getItem('customFrames_v1');
      if (raw) setCustomFrames(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('customFrames_v1', JSON.stringify(customFrames));
    } catch {}
  }, [customFrames]);

  const onSelectFile = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => setImageSrc(reader.result));
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const onUploadFrame = (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      createImage(dataUrl).then((img) => {
        const newFrame = { id: `custom-${uuidv4()}`, name: file.name, src: dataUrl, aspect: img.width / img.height };
        setCustomFrames((s) => [newFrame, ...s]);
        setSelectedFrame(newFrame);
      });
    };
    reader.readAsDataURL(file);
  };

  const removeCustomFrame = (id) => {
    if (confirm('Xóa khung này?')) setCustomFrames((s) => s.filter((f) => f.id !== id));
  };

  const generateMergedImage = async (outputWidth = 2000) => {
    if (!imageSrc || !selectedFrame || !croppedAreaPixels) return null;
    try {
      const img = await createImage(imageSrc);
      const frameImg = await createImage(selectedFrame.src);
      const aspect = selectedFrame.aspect || 1;
      const width = outputWidth;
      const height = Math.max(1, Math.round(width / aspect));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
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
      console.error(err);
      return null;
    }
  };

  const onDownloadPreview = async () => {
    const dataUrl = await generateMergedImage();
    if (!dataUrl) return alert('Không có ảnh để tải.');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `photo-${Date.now()}.png`;
    link.click();
  };

  // ✅ FIXED: Gửi ảnh về WordPress thay vì /api/upload
  const onSubmit = async () => {
    try {
      const dataUrl = await generateMergedImage();
      if (!dataUrl) {
        alert('Vui lòng upload ảnh và crop trước khi gửi.');
        return;
      }

      const endpoint = process.env.WP_UPLOAD_ENDPOINT;
      console.log('📡 Đang gửi ảnh tới:', endpoint);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      console.log('✅ Ảnh đã upload:', data);
      alert('Gửi thành công! Ảnh đã lưu lên WordPress.');
    } catch (err) {
      console.error(err);
      alert('Có lỗi khi gửi ảnh: ' + err.message);
    }
  };

  // pricing UI
  useEffect(() => {
    const pricingObj = priceTable[group] && priceTable[group][size];
    const p = findBracket(pricingObj, Number(quantity));
    setPricePerPic(p || 0);
  }, [group, size, quantity]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* ... phần giao diện giữ nguyên */}
      {/* các nút hành động */}
      <div className="flex gap-2">
        <button onClick={onDownloadPreview} className="px-4 py-2 bg-indigo-600 text-white rounded">Tải preview</button>
        <button onClick={onSubmit} className="px-4 py-2 bg-green-600 text-white rounded">Gửi đặt in</button>
      </div>
    </div>
  );
}

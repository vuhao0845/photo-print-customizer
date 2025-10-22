/*
Photo Print Customizer - Next.js page

FEATURE: Người dùng có thể upload ảnh, chọn khung PNG (kể cả custom), crop và gửi in.
*/

import React, { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { v4 as uuidv4 } from 'uuid';

// Các khung mẫu sẵn có
const builtInFrames = [
  { id: 'frame-classic', name: 'Classic White', src: '/frames/frame1.png', aspect: 4 / 5 },
  { id: 'frame-polaroid', name: 'Polaroid', src: '/frames/frame2.png', aspect: 1 },
  { id: 'frame-instagram', name: 'Instagram Mockup', src: '/frames/frame3.png', aspect: 1.08 },
];

export default function PhotoCustomizer() {
  const [imageSrc, setImageSrc] = useState(null);
  const [selectedFrame, setSelectedFrame] = useState(builtInFrames[0]);
  const [customFrames, setCustomFrames] = useState([]);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // Load lại khung đã lưu trong localStorage
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('customFrames_v1') || '[]');
    setCustomFrames(stored);
  }, []);

  // Khi thêm khung mới, lưu lại vào localStorage
  useEffect(() => {
    localStorage.setItem('customFrames_v1', JSON.stringify(customFrames));
  }, [customFrames]);

  // Chọn ảnh chính
  const onSelectFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result);
    reader.readAsDataURL(file);
  };

  // Upload khung PNG tùy chỉnh
  const onUploadFrame = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const newFrame = { id: uuidv4(), name: file.name, src: reader.result, aspect: 1 };
      setCustomFrames((s) => [newFrame, ...s]);
      setSelectedFrame(newFrame);
    };
    reader.readAsDataURL(file);
  };

  // Xử lý crop
  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Gộp ảnh chính + khung → tạo ảnh cuối
  const generateMergedImage = async () => {
    if (!imageSrc || !selectedFrame || !croppedAreaPixels)
      return alert('Vui lòng chọn ảnh, crop và chọn khung trước.');

    const img = new Image();
    const frameImg = new Image();
    img.crossOrigin = 'anonymous';
    frameImg.crossOrigin = 'anonymous';
    img.src = imageSrc;
    frameImg.src = selectedFrame.src;

    await Promise.all([
      new Promise((res) => (img.onload = res)),
      new Promise((res) => (frameImg.onload = res)),
    ]);

    const canvas = document.createElement('canvas');
    const width = 800;
    const height = Math.round(width / (selectedFrame.aspect || 1));
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

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

    const finalImg = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = finalImg;
    a.download = 'print-image.png';
    a.click();
  };

  return (
    <div className="container">
      <h2>Upload & Chỉnh ảnh</h2>

      <input type="file" accept="image/*" onChange={onSelectFile} />
      <input type="file" accept="image/png" onChange={onUploadFrame} style={{ marginLeft: 10 }} />

      <div style={{ margin: '20px auto', width: 400, height: 400, position: 'relative' }}>
        {imageSrc ? (
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={selectedFrame?.aspect || 1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        ) : (
          <p>📷 Chọn 1 ảnh để bắt đầu.</p>
        )}

        {selectedFrame && imageSrc && (
          <img
            src={selectedFrame.src}
            alt="Frame overlay"
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
      </div>

      {/* Danh sách khung */}
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', marginTop: 20 }}>
        {builtInFrames.concat(customFrames).map((frame) => (
          <div key={frame.id} onClick={() => setSelectedFrame(frame)} style={{ cursor: 'pointer' }}>
            <img
              src={frame.src}
              alt={frame.name}
              width="100"
              style={{
                border:
                  selectedFrame?.id === frame.id
                    ? '3px solid #0070f3'
                    : '1px solid #ccc',
                borderRadius: 8,
              }}
            />
            <p style={{ fontSize: 12, textAlign: 'center' }}>{frame.name}</p>
          </div>
        ))}
      </div>

      <button
        onClick={generateMergedImage}
        style={{
          marginTop: 20,
          backgroundColor: '#0070f3',
          color: 'white',
          padding: '8px 16px',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        Tải ảnh đã chỉnh
      </button>
    </div>
  );
}

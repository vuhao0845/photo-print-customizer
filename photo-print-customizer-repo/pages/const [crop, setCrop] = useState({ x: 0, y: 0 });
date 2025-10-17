/*
Photo Print Customizer - Next.js page (single-file template)

FEATURE UPDATE: Added ability for admin/user to upload custom frame PNGs at runtime.
Uploaded frames are stored in localStorage (so they persist per browser) and shown alongside built-in frames.

INSTRUCTIONS:
1) Put this file under: /app/photo-customizer/page.jsx (Next.js 13+ app router) OR /pages/photo-customizer.jsx for pages router.
2) Add example frame images into public/frames/ if you want built-in frames (optional).
3) Install dependencies:
   npm install react-easy-crop uuid

4) This page posts the final merged image (as a base64 payload) to /api/upload. See earlier sample API route in the original template.

NOTES:
- Uploaded frames should ideally be PNGs with transparent center. The UI will accept any image but preview behavior is best with transparent frames.
- Persistence: custom frames are saved to localStorage under key `customFrames_v1` so they survive page reloads in the same browser.
- For production, store uploaded frame files on server/cloud storage and reference by URL.
*/

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import { v4 as uuidv4 } from 'uuid';

// ----- Pricing data (unchanged) -----
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
  // built-in frames (paths relative to /public/frames)
  const builtInFrames = [
    { id: 'frame-classic', name: 'Classic White', src: '/frames/frame1.png', aspect: 4 / 5 },
    { id: 'frame-polaroid', name: 'Polaroid', src: '/frames/frame2.png', aspect: 1 },
    { id: 'frame-instagram', name: 'Instagram Mockup', src: '/frames/frame3.png', aspect: 1.08 },
  ];

  const [customFrames, setCustomFrames] = useState([]); // {id,name,src,aspect}
  const allFrames = [...builtInFrames, ...customFrames];

  // main image state
  const [imageSrc, setImageSrc] = useState(null);
  const [selectedFrame, setSelectedFrame] = useState(allFrames[0] || null);

  // crop
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // customer data
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  // pricing
  const [group, setGroup] = useState('Màng Sleeve');
  const [size, setSize] = useState(Object.keys(priceTable['Màng Sleeve'])[0]);
  const [quantity, setQuantity] = useState(10);
  const [pricePerPic, setPricePerPic] = useState(null);

  const inputRef = useRef();
  const previewCanvasRef = useRef();

  // load custom frames from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('customFrames_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        setCustomFrames(Array.isArray(parsed) ? parsed : []);
      }
    } catch (e) {
      console.warn('Failed to load custom frames', e);
    }
  }, []);

  // whenever custom frames change, persist
  useEffect(() => {
    try {
      localStorage.setItem('customFrames_v1', JSON.stringify(customFrames));
    } catch (e) {
      console.warn('Failed to save custom frames', e);
    }
  }, [customFrames]);

  // keep selectedFrame in sync when frames list changes
  useEffect(() => {
    const all = [...builtInFrames, ...customFrames];
    if (!selectedFrame && all.length > 0) setSelectedFrame(all[0]);
    // if selectedFrame was removed, reset
    if (selectedFrame && !all.find((f) => f.id === selectedFrame.id)) setSelectedFrame(all[0] || null);
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

  // upload a custom frame (client-side only, saved to localStorage as dataURL)
  const onUploadFrame = (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      // attempt to guess aspect from image dimensions
      createImage(dataUrl)
        .then((img) => {
          const newFrame = { id: `custom-${uuidv4()}`, name: file.name, src: dataUrl, aspect: img.width / img.height };
          setCustomFrames((s) => [newFrame, ...s]);
          setSelectedFrame(newFrame);
        })
        .catch((err) => {
          console.error('Frame load failed', err);
          // still save with default aspect 1
          const newFrame = { id: `custom-${uuidv4()}`, name: file.name, src: dataUrl, aspect: 1 };
          setCustomFrames((s) => [newFrame, ...s]);
          setSelectedFrame(newFrame);
        });
    };
    reader.readAsDataURL(file);
    // reset value to allow uploading same file later
    e.target.value = '';
  };

  const removeCustomFrame = (id) => {
    if (!confirm('Xóa khung này?')) return;
    setCustomFrames((s) => s.filter((f) => f.id !== id));
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

      // draw the cropped area to canvas
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

      // draw frame on top
      ctx.drawImage(frameImg, 0, 0, width, height);

      return canvas.toDataURL('image/png');
    } catch (err) {
      console.error('Merge failed', err);
      return null;
    }
  };

  const onDownloadPreview = async () => {
    const dataUrl = await generateMergedImage();
    if (!dataUrl) {
      alert('Không có ảnh để tải.');
      return;
    }
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `photo-${selectedFrame?.id || 'out'}-${Date.now()}.png`;
    link.click();
  };

  const onSubmit = async () => {
    try {
      const dataUrl = await generateMergedImage();
      if (!dataUrl) {
        alert('Vui lòng upload ảnh và crop trước khi gửi.');
        return;
      }

      const pricingObj = priceTable[group] && priceTable[group][size];
      const bracketPrice = findBracket(pricingObj, quantity);
      const price = bracketPrice ? bracketPrice : 0;

      const payload = {
        filename: `order-${uuidv4()}.png`,
        dataUrl,
        name,
        phone,
        notes,
        frameId: selectedFrame?.id || null,
        pricing: { group, size, quantity, pricePerPic: price, total: price * quantity },
      };

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Upload failed');
      await res.json();
      alert('Gửi thành công!');
    } catch (err) {
      console.error(err);
      alert('Có lỗi: ' + (err.message || err));
    }
  };

  // pricing UI
  useEffect(() => {
    const pricingObj = priceTable[group] && priceTable[group][size];
    if (!pricingObj) {
      setPricePerPic(null);
      return;
    }
    const p = findBracket(pricingObj, Number(quantity));
    setPricePerPic(p || 0);
  }, [group, size, quantity]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow p-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column: controls & pricing */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-2xl font-semibold">Upload & Chỉnh ảnh</h2>

          <div>
            <input type="file" accept="image/*" onChange={onSelectFile} className="block w-full text-sm text-gray-600" />
          </div>

          <div>
            <label className="block text-sm font-medium">Upload khung (PNG có vùng trong suốt)</label>
            <input type="file" accept="image/*" onChange={onUploadFrame} className="block w-full text-sm text-gray-600 mt-1" />
            <div className="text-xs text-gray-500 mt-1">Khung đã upload sẽ lưu trên trình duyệt của bạn (localStorage).</div>
          </div>

          <div>
            <label className="block text-sm font-medium">Chọn khung</label>
            <div className="mt-2 grid grid-cols-1 gap-2 max-h-80 overflow-auto">
              {allFrames.map((f) => (
                <div key={f.id} className={`flex items-center gap-2 p-2 border rounded ${selectedFrame?.id === f.id ? 'ring-2 ring-indigo-400' : ''}`}>
                  <button onClick={() => setSelectedFrame(f)} className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <img src={f.src} alt={f.name} className="w-20 h-14 object-cover rounded" />
                      <div>
                        <div className="text-sm font-medium">{f.name}</div>
                        <div className="text-xs text-gray-500">Aspect: {Number(f.aspect).toFixed(2)}</div>
                      </div>
                    </div>
                  </button>
                  {f.id.startsWith('custom-') && (
                    <button onClick={() => removeCustomFrame(f.id)} className="ml-2 text-xs text-red-600 px-2 py-1 border rounded">Xóa</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Thông tin khách</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Họ tên" className="mt-1 block w-full rounded p-2 border" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Sđt" className="mt-2 block w-full rounded p-2 border" />
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ghi chú in" className="mt-2 block w-full rounded p-2 border" rows={3} />
          </div>

          <div className="flex gap-2">
            <button onClick={onDownloadPreview} className="px-4 py-2 bg-indigo-600 text-white rounded">Tải preview</button>
            <button onClick={onSubmit} className="px-4 py-2 bg-green-600 text-white rounded">Gửi đặt in</button>
          </div>

          <div className="text-xs text-gray-500 mt-2">Lưu ý: Khung nên là ảnh PNG có vùng trong suốt để ảnh người dùng hiện ở phía sau.</div>

          {/* Pricing calculator */}
          <div className="mt-4 border-t pt-4">
            <h3 className="font-semibold">Tính thử giá in</h3>
            <div className="mt-2 space-y-2">
              <label className="block">Nhóm</label>
              <select value={group} onChange={(e) => setGroup(e.target.value)} className="w-full p-2 border rounded">
                {Object.keys(priceTable).map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>

              <label className="block">Kích thước</label>
              <select value={size} onChange={(e) => setSize(e.target.value)} className="w-full p-2 border rounded">
                {Object.keys(priceTable[group] || {}).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <label className="block">Số lượng ảnh</label>
              <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full p-2 border rounded" />

              <div className="mt-2">
                <div>Giá mỗi ảnh: <strong>{pricePerPic !== null ? `${pricePerPic.toLocaleString()} VND` : '—'}</strong></div>
                <div>Tổng: <strong>{pricePerPic !== null ? `${(pricePerPic * quantity).toLocaleString()} VND` : '—'}</strong></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: crop / preview area (span 4 cols) */}
        <div className="lg:col-span-4">
          <h3 className="text-lg font-medium">Chỉnh crop & Xem trước</h3>

          <div className="mt-4 h-[760px] bg-gray-100 rounded flex items-center justify-center relative overflow-hidden">
            {!imageSrc && (
              <div className="text-gray-400">Chưa có ảnh - hãy upload một bức ảnh để bắt đầu</div>
            )}

            {imageSrc && selectedFrame && (
              <div className="absolute inset-0 flex flex-col lg:flex-row">
                <div className="lg:w-1/2 flex items-center justify-center">
                  <div className="relative w-full h-full">
                    <Cropper
                      image={imageSrc}
                      crop={crop}
                      zoom={zoom}
                      aspect={selectedFrame.aspect}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={onCropComplete}
                      objectFit="horizontal-cover"
                    />
                  </div>
                </div>

                <div className="lg:w-1/2 p-4 overflow-auto">
                  <div className="mb-2">Zoom</div>
                  <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />

                  <div className="mt-4">Preview (merged)</div>
                  <div className="mt-2 border rounded overflow-hidden">
                    <PreviewCanvas imageSrc={imageSrc} frameSrc={selectedFrame.src} croppedAreaPixels={croppedAreaPixels} ref={previewCanvasRef} />
                  </div>

                  <div className="mt-4">
                    <h4 className="font-semibold">Bảng giá (tham khảo)</h4>
                    <PricingTable />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const PreviewCanvas = React.forwardRef(({ imageSrc, frameSrc, croppedAreaPixels }, ref) => {
  const canvasRef = useRef();

  useEffect(() => {
    let cancelled = false;
    const draw = async () => {
      if (!imageSrc || !frameSrc || !croppedAreaPixels) return;
      try {
        const img = await createImage(imageSrc);
        const frame = await createImage(frameSrc);

        const width = 600;
        const height = Math.max(1, Math.round(600 / (frame.width / frame.height)));
        const canvas = canvasRef.current;
        if (!canvas) return;
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
        ctx.drawImage(frame, 0, 0, width, height);
      } catch (err) {
        console.error('Preview draw error:', err);
      }
    };
    draw();
    return () => (cancelled = true);
  }, [imageSrc, frameSrc, croppedAreaPixels]);

  React.useImperativeHandle(ref, () => ({
    toDataURL: () => canvasRef.current?.toDataURL('image/png'),
  }));

  return <canvas ref={canvasRef} className="w-full h-auto max-h-96" />;
});

function PricingTable() {
  const rows = [];
  Object.entries(priceTable).forEach(([grp, sizes]) => {
    Object.entries(sizes || {}).forEach(([sz, pricing]) => {
      const szStr = String(sz);
      rows.push(
        <tr key={`${grp}-${szStr}`}>
          <td className="p-2 border align-top">{grp}</td>
          <td className="p-2 border align-top">{szStr}</td>
          <td className="p-2 border">
            <div className="space-y-1">
              {Object.entries(pricing || {}).map(([range, p]) => (
                <div key={range} className="flex justify-between">
                  <div>{range}</div>
                  <div>{Number(p).toLocaleString()} VND</div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      );
    });
  });

  return (
    <div className="overflow-auto mt-2">
      <table className="min-w-full table-fixed text-sm border">
        <thead>
          <tr className="bg-blue-200">
            <th className="p-2 border">Nhóm</th>
            <th className="p-2 border">Kích thước</th>
            <th className="p-2 border">Khung số lượng -&gt; Giá (VND)</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}

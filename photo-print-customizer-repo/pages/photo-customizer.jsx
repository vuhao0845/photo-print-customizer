/*
  Photo Print Customizer – Full Version
  ✅ Upload + chọn khung + crop
  ✅ Form thông tin khách hàng
  ✅ Bảng giá động (Màng Sleeve & Ép Plastic)
  ✅ Gửi đơn đặt in (qua API)
*/

import React, { useState, useEffect, useCallback } from "react";
import Cropper from "react-easy-crop";
import { v4 as uuidv4 } from "uuid";

// ==== Bảng giá in ảnh ====
const priceTable = {
  "Màng Sleeve": {
    "5x7": { "<15": 4800, "15-40": 4300, "41-100": 3800, "101-150": 3300, "1000+": 1500 },
    "6x9": { "<15": 6500, "15-40": 6000, "41-100": 4000, "101-150": 3500, "1000+": 1800 },
  },
  "Ép Plastic": {
    "5x7": { "<15": 5000, "15-40": 4500, "41-100": 4000, "101-150": 3500, "1000+": 1800 },
    "6x9": { "<15": 7000, "15-40": 6500, "41-100": 6000, "101-150": 5500, "1000+": 2000 },
    "9x12": { "<15": 8000, "15-40": 7500, "41-100": 7000, "101-150": 6500, "1000+": 3500 },
    "10x15": { "<15": 10000, "15-40": 9000, "41-100": 8000, "101-150": 7500, "1000+": 5000 },
    "13x18": { "<15": 15000, "15-40": 14500, "41-100": 14000, "101-150": 12000, "1000+": 5000 },
    "15x21": { "<15": 17000, "15-40": 16000, "41-100": 14000, "101-150": 13000, "1000+": 11000 },
    "21x29 (A4)": { "<15": 20000, "15-40": 18000, "41-100": 17000, "101-150": 15500, "1000+": 5000 },
  },
};

// ==== Hàm chọn giá phù hợp theo số lượng ====
function getPrice(category, size, qty) {
  const data = priceTable[category]?.[size];
  if (!data) return 0;
  if (qty < 15) return data["<15"];
  if (qty <= 40) return data["15-40"];
  if (qty <= 100) return data["41-100"];
  if (qty <= 150) return data["101-150"];
  return data["1000+"];
}

// ==== Component chính ====
export default function PhotoCustomizer() {
  const [imageSrc, setImageSrc] = useState(null);
  const [frameSrc, setFrameSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // Form khách hàng
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  // Bảng giá
  const [category, setCategory] = useState("Màng Sleeve");
  const [size, setSize] = useState("5x7");
  const [qty, setQty] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setTotal(qty * getPrice(category, size, qty));
  }, [category, size, qty]);

  // ==== Upload ảnh ====
  const onSelectFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result);
    reader.readAsDataURL(file);
  };

  // ==== Upload khung ====
  const onUploadFrame = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFrameSrc(reader.result);
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // ==== Merge ảnh + khung ====
  const generateMergedImage = async () => {
    if (!imageSrc) return alert("Vui lòng chọn ảnh!");
    const img = new Image();
    img.src = imageSrc;
    await new Promise((res) => (img.onload = res));

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 800;
    canvas.height = 800;
    ctx.drawImage(img, 0, 0, 800, 800);

    if (frameSrc) {
      const frame = new Image();
      frame.src = frameSrc;
      await new Promise((res) => (frame.onload = res));
      ctx.drawImage(frame, 0, 0, 800, 800);
    }
    return canvas.toDataURL("image/png");
  };

  // ==== Gửi đơn hàng ====
  const handleSubmit = async () => {
    const merged = await generateMergedImage();
    if (!merged) return;

    const payload = {
      id: uuidv4(),
      name,
      phone,
      note,
      category,
      size,
      qty,
      total,
      image: merged,
      createdAt: new Date().toISOString(),
    };

    console.log("📦 Đơn hàng gửi đi:", payload);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) alert("✅ Gửi đơn hàng thành công!");
      else alert("❌ Lỗi: " + data.error);
    } catch (err) {
      alert("Lỗi gửi dữ liệu: " + err.message);
    }
  };

  // ==== Giao diện ====
  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      <h2 className="text-2xl font-bold mb-4 text-center">Upload & Chỉnh ảnh</h2>

      <div className="flex flex-col items-center gap-2">
        <input type="file" accept="image/*" onChange={onSelectFile} />
        <input type="file" accept="image/png" onChange={onUploadFrame} />
      </div>

      {imageSrc && (
        <div className="my-4 flex justify-center">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
      )}

      {/* Form khách hàng */}
      <div className="max-w-xl mx-auto bg-white p-4 rounded-xl shadow">
        <h3 className="font-bold text-lg mb-2">Thông tin khách hàng</h3>
        <input
          type="text"
          placeholder="Họ và tên"
          className="border p-2 w-full mb-2 rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="tel"
          placeholder="Số điện thoại"
          className="border p-2 w-full mb-2 rounded"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <textarea
          placeholder="Ghi chú"
          className="border p-2 w-full mb-2 rounded"
          rows="3"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        ></textarea>
      </div>

      {/* Bảng giá */}
      <div className="max-w-xl mx-auto bg-white mt-6 p-4 rounded-xl shadow">
        <h3 className="font-bold text-lg mb-2">Bảng giá in ảnh</h3>
        <div className="flex flex-col gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border p-2 rounded"
          >
            {Object.keys(priceTable).map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>

          <select
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="border p-2 rounded"
          >
            {Object.keys(priceTable[category]).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>

          <input
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="border p-2 rounded"
          />
        </div>

        <p className="mt-3 font-semibold">
          💰 Giá mỗi ảnh: {getPrice(category, size, qty).toLocaleString()} VNĐ
        </p>
        <p className="font-semibold">
          🧾 Tổng cộng: {total.toLocaleString()} VNĐ
        </p>
      </div>

      <div className="text-center mt-6">
        <button
          onClick={handleSubmit}
          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
        >
          Gửi đặt in
        </button>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from "react";
import Cropper from "react-easy-crop";
import { v4 as uuidv4 } from "uuid";

// BẢNG GIÁ
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
    "15x21": { "<15": 17000, "15-40": 15000, "41-100": 14000, "101-150": 13000, "1000+": 11000 },
    "21x29 (A4)": { "<15": 20000, "15-40": 18000, "41-100": 17000, "101-150": 15000, "1000+": 5000 },
  },
};

const builtInFrames = [
  { id: "frame1", name: "Classic White", src: "/frames/frame1.png" },
  { id: "frame2", name: "Polaroid", src: "/frames/frame2.png" },
  { id: "frame3", name: "Instagram Mockup", src: "/frames/frame3.png" },
];

export default function PhotoCustomizer() {
  const [imageSrc, setImageSrc] = useState(null);
  const [selectedFrame, setSelectedFrame] = useState(builtInFrames[0]);
  const [customFrames, setCustomFrames] = useState([]);

  const [group, setGroup] = useState("Màng Sleeve");
  const [size, setSize] = useState("5x7");
  const [quantity, setQuantity] = useState(10);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  // Upload ảnh
  const onSelectFile = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImageSrc(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Upload khung
  const onUploadFrame = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const newFrame = { id: uuidv4(), name: file.name, src: reader.result };
      setCustomFrames((f) => [newFrame, ...f]);
      setSelectedFrame(newFrame);
    };
    reader.readAsDataURL(file);
  };

  // Tính giá theo số lượng
  const getPrice = () => {
    const data = priceTable[group][size];
    if (quantity < 15) return data["<15"];
    if (quantity <= 40) return data["15-40"];
    if (quantity <= 100) return data["41-100"];
    if (quantity <= 150) return data["101-150"];
    return data["1000+"];
  };

  const handleSubmit = () => {
    alert(`Đặt in thành công!\nKhách hàng: ${name}\nSố điện thoại: ${phone}\nGhi chú: ${note}`);
  };

  return (
    <div className="container" style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h2>Upload & Chỉnh ảnh</h2>

      <input type="file" accept="image/*" onChange={onSelectFile} />
      <input type="file" accept="image/*" onChange={onUploadFrame} className="mt-2" />

      <div style={{ display: "flex", gap: "10px", marginTop: "20px", overflowX: "auto" }}>
        {[...builtInFrames, ...customFrames].map((frame) => (
          <img
            key={frame.id}
            src={frame.src}
            alt={frame.name}
            width="100"
            style={{
              border: frame.id === selectedFrame.id ? "3px solid blue" : "1px solid #ccc",
              cursor: "pointer",
            }}
            onClick={() => setSelectedFrame(frame)}
          />
        ))}
      </div>

      {/* --- FORM KHÁCH HÀNG --- */}
      <div style={{ marginTop: "30px" }}>
        <h3>Thông tin khách hàng</h3>
        <input
          type="text"
          placeholder="Họ và tên"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ display: "block", marginBottom: "10px", width: "300px" }}
        />
        <input
          type="text"
          placeholder="Số điện thoại"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ display: "block", marginBottom: "10px", width: "300px" }}
        />
        <textarea
          placeholder="Ghi chú"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ display: "block", marginBottom: "10px", width: "300px", height: "80px" }}
        />
      </div>

      {/* --- BẢNG GIÁ --- */}
      <div style={{ marginTop: "30px" }}>
        <h3>Bảng giá in ảnh</h3>
        <select value={group} onChange={(e) => setGroup(e.target.value)}>
          {Object.keys(priceTable).map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        <select value={size} onChange={(e) => setSize(e.target.value)}>
          {Object.keys(priceTable[group]).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value))}
          style={{ width: "80px", marginLeft: "10px" }}
        />
        <p style={{ marginTop: "10px" }}>
          Giá mỗi ảnh: <b>{getPrice().toLocaleString()} VNĐ</b>
        </p>
      </div>

      <button
        onClick={handleSubmit}
        style={{ background: "#0070f3", color: "white", padding: "10px 20px", borderRadius: "6px", marginTop: "20px" }}
      >
        Gửi đặt in
      </button>
    </div>
  );
}

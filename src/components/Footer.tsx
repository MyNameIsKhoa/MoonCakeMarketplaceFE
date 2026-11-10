export default function Footer() {
  return <footer className="bg-primary-950 text-gray-300">
    <div className="mss-container flex flex-wrap items-center justify-between gap-3 py-7">
      <div>
        <p className="font-bold text-white">MooncakeHub</p>
        <p className="text-sm">Sàn mua sắm bánh trung thu và báo giá theo yêu cầu.</p>
      </div>
      <p className="text-sm">© {new Date().getFullYear()} MooncakeHub</p>
    </div>
  </footer>;
}

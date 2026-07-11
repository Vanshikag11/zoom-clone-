"use client";

export default function Navbar() {
  return (
    <nav className="bg-zoomdark text-white px-6 py-3 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-zoomblue rounded-md flex items-center justify-center font-bold">Z</div>
        <span className="text-lg font-semibold">ZoomClone</span>
      </div>
      <div className="flex items-center gap-4">
        <button className="text-sm text-gray-300 hover:text-white">Settings</button>
        <div className="w-9 h-9 rounded-full bg-gray-500 flex items-center justify-center text-sm font-medium">
          DU
        </div>
      </div>
    </nav>
  );
}

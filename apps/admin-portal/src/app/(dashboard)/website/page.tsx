"use client";
import { useState } from "react";

type PageType = "HOME" | "ABOUT" | "ADMISSIONS" | "EVENTS" | "GALLERY" | "CONTACT";

interface WebPage {
  type: PageType;
  title: string;
  published: boolean;
  lastEdited: string;
  content: string;
}

const DEFAULT_PAGES: WebPage[] = [
  { type: "HOME", title: "Welcome to Our School", published: true, lastEdited: "2026-04-18", content: "Welcome to our school. We provide quality education since 1995." },
  { type: "ABOUT", title: "About Us", published: true, lastEdited: "2026-04-17", content: "Our school is committed to holistic development..." },
  { type: "ADMISSIONS", title: "Admissions 2026-27", published: true, lastEdited: "2026-04-15", content: "Applications open for all grades. Submit your enquiry today." },
  { type: "EVENTS", title: "Events & News", published: true, lastEdited: "2026-04-19", content: "Annual Day on 15th May 2026. Science Fair on 22nd May 2026." },
  { type: "GALLERY", title: "Photo Gallery", published: false, lastEdited: "2026-04-10", content: "" },
  { type: "CONTACT", title: "Contact Us", published: true, lastEdited: "2026-04-12", content: "Phone: +91 98765 43210 | Email: admin@school.edu" },
];

const PAGE_ICONS: Record<PageType, string> = {
  HOME: "🏠", ABOUT: "ℹ️", ADMISSIONS: "📝", EVENTS: "📅", GALLERY: "🖼️", CONTACT: "📞",
};

export default function SchoolWebsitePage() {
  const [pages, setPages] = useState<WebPage[]>(DEFAULT_PAGES);
  const [editing, setEditing] = useState<WebPage | null>(null);
  const [saved, setSaved] = useState(false);

  const togglePublish = (type: PageType) => {
    setPages((prev) => prev.map((p) => p.type === type ? { ...p, published: !p.published } : p));
  };

  const saveContent = () => {
    if (!editing) return;
    setPages((prev) => prev.map((p) => p.type === editing.type ? { ...editing, lastEdited: new Date().toISOString().split("T")[0] } : p));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setEditing(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">School Public Website CMS</h1>
        <a
          href="#"
          target="_blank"
          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
        >
          Preview Site ↗
        </a>
      </div>

      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-lg">
          Page saved successfully.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {pages.map((page) => (
          <div key={page.type} className="bg-white border rounded-xl p-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{PAGE_ICONS[page.type]}</span>
              <div>
                <p className="font-medium text-gray-900">{page.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">Last edited: {page.lastEdited}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditing(page)}
                className="text-xs px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
              >
                Edit
              </button>
              <button
                onClick={() => togglePublish(page.type)}
                className={`text-xs px-3 py-1 rounded-lg font-medium ${
                  page.published ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {page.published ? "Published" : "Draft"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Enquiry form → Admission Service info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <strong>Enquiry Form</strong> on the Admissions page automatically routes submissions to the Admission Service. Custom domain + SSL configured via Nginx.
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">{PAGE_ICONS[editing.type]} Edit: {editing.title}</h2>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Page Title</label>
                <input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  rows={8}
                  value={editing.content}
                  onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Page content…"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={saveContent} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Page</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

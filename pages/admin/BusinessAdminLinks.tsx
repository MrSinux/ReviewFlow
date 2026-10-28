import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { dataService } from '../../services/dataService';
import { getPublicOrigin } from '../../services/publicUrl';
import { Business, EntryPoint } from '../../types';
import {
  Copy,
  Link as LinkIcon,
  Plus,
  Pencil,
  Trash2,
  QrCode,
  Download,
  Share2,
  Search,
} from 'lucide-react';

const makeId = () => `ep_${Date.now()}_${Math.random().toString(16).slice(2)}`;
const slugifyEntrySource = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
};

const canvasIdForEntryPoint = (entryPointId: string) => `entry-point-qr-${entryPointId}`;

const getQrCanvas = (entryPointId: string): HTMLCanvasElement | null => {
  const element = document.getElementById(canvasIdForEntryPoint(entryPointId));
  return element instanceof HTMLCanvasElement ? element : null;
};

const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Unable to generate QR image.'));
    }, 'image/png');
  });

const downloadQrCode = async (entryPointId: string, fileName: string) => {
  const canvas = getQrCanvas(entryPointId);
  if (!canvas) {
    alert('QR code not found.');
    return;
  }

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const shareEntryPoint = async (entryPointId: string, label: string, url: string) => {
  try {
    const canvas = getQrCanvas(entryPointId);

    if (!navigator.share) {
      await copyToClipboard(url);
      alert('Sharing is not supported on this device. Link copied instead.');
      return;
    }

    if (!canvas) {
      await navigator.share({
        title: `${label} QR Code`,
        text: `Scan this QR code or open this link for ${label}.`,
        url,
      });
      return;
    }

    const blob = await canvasToBlob(canvas);
    const file = new File([blob], `${label.toLowerCase().replace(/\s+/g, '-')}-qr.png`, {
      type: 'image/png',
    });

    const canShareFiles =
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] });

    if (canShareFiles) {
      await navigator.share({
        title: `${label} QR Code`,
        text: `Scan this QR code or open this link for ${label}.`,
        url,
        files: [file],
      });
      return;
    }

    await navigator.share({
      title: `${label} QR Code`,
      text: `Scan this QR code or open this link for ${label}.`,
      url,
    });
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') return;

    try {
      await copyToClipboard(url);
      alert('Could not open the share sheet. Link copied instead.');
    } catch {
      alert('Unable to share this entry point right now.');
    }
  }
};

const BusinessAdminLinks: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const b = await dataService.getBusinessBySlug(slug);
      setBusiness(b);
      setLoading(false);
    })();
  }, [slug]);

  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EntryPoint | null>(null);
  const [label, setLabel] = useState('');
  const [src, setSrc] = useState('');

  const publicPath = useMemo(() => `/r/${slug}`, [slug]);

  // Absolute public URL for QR + copy/open
  const publicUrl = useMemo(() => `${getPublicOrigin()}${publicPath}`, [publicPath]);

  const entryPoints = business?.entryPoints || [];

  const filteredEntryPoints = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entryPoints;
    return entryPoints.filter((ep) => ep.label.toLowerCase().includes(q));
  }, [entryPoints, search]);

  const openCreate = () => {
  setEditing(null);
  setLabel('');
  setSrc('');
  setModalOpen(true);
};
  
  const openEdit = (ep: EntryPoint) => {
  setEditing(ep);
  setLabel(ep.label);
  setSrc(ep.src);
  setModalOpen(true);
};
  
  const saveEntryPoint = async () => {
  if (!business) return;

  const trimmedLabel = label.trim();
  const autoSrc = slugifyEntrySource(trimmedLabel);

  if (!trimmedLabel || !autoSrc) return;

  const updated: Business = {
    ...business,
    entryPoints: editing
      ? entryPoints.map((e) =>
          e.id === editing.id
            ? { ...e, label: trimmedLabel, src: autoSrc }
            : e
        )
      : [...entryPoints, { id: makeId(), label: trimmedLabel, src: autoSrc }],
  };

  await dataService.saveBusiness(updated);
  setBusiness(updated);
  setModalOpen(false);
};

  const deleteEntryPoint = async (id: string) => {
    if (!business) return;
    if (!window.confirm('Delete this entry point?')) return;

    const updated: Business = {
      ...business,
      entryPoints: entryPoints.filter((e) => e.id !== id),
    };

    await dataService.saveBusiness(updated);
    setBusiness(updated);
  };

  if (loading) return <div className="p-8 text-sm text-gray-500">Loading links...</div>;
  if (!business) return <div className="p-8 text-sm text-gray-500">Loading links...</div>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Links & QR</h2>
          <p className="text-slate-500">Share your public review link and manage QR entry points.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-slate-800"
        >
          <Plus size={18} />
          Add Entry Point
        </button>
      </header>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="space-y-1">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400">Public Link</div>
          <div className="text-sm font-medium text-slate-900 flex items-center gap-2">
            <LinkIcon size={16} className="text-slate-400" />
            <span className="break-all">{publicUrl}</span>
          </div>
          <p className="text-xs text-slate-400">Use this link anywhere (posters, receipts, SMS) to route customers.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => copyToClipboard(publicUrl)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Copy size={16} />
            
          </button>
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
          >
            <QrCode size={16} />
            Open
          </a>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center justify-between flex-1">
            <h3 className="font-bold text-slate-900">Entry Points</h3>
            <span className="text-xs text-slate-400">{entryPoints.length} total</span>
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by label…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>
        </div>

        {entryPoints.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No entry points yet. Add one to generate a QR code.</div>
        ) : filteredEntryPoints.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No entry points match "{search}".</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredEntryPoints.map((ep) => {
              const url = `${publicUrl}?src=${encodeURIComponent(ep.src)}`;
              const qrFileName = `${business.slug || slug || 'business'}-${ep.src}-qr.png`;

              return (
                <div key={ep.id} className="p-6 flex flex-col xl:flex-row xl:items-center gap-6">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-24 h-24 rounded-xl border border-slate-200 flex items-center justify-center bg-white shrink-0">
                      <QRCodeCanvas
                        id={canvasIdForEntryPoint(ep.id)}
                        value={url}
                        size={84}
                        includeMargin
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900">{ep.label}</div>
                      <div className="text-xs text-slate-400">src: {ep.src}</div>
                      <div className="text-xs text-slate-500 mt-1 break-all">{url}</div>
                    </div>
                  </div>

                  <div className="xl:ml-auto flex flex-wrap gap-2">
                    <button
                      onClick={() => copyToClipboard(url)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                      <Copy size={16} />
                      
                    </button>
                    
                    <button
                      onClick={() => downloadQrCode(ep.id, qrFileName)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                      <Download size={16} />
                      
                    </button>

                    <button
                      onClick={() => shareEntryPoint(ep.id, ep.label, url)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                      <Share2 size={16} />
                      
                    </button>

                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800"
                    >
                      <LinkIcon size={16} />
                      Open
                    </a>

                    <button
                      onClick={() => openEdit(ep)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                      title="Edit"
                    >
                      <Pencil size={16} />
                      
                    </button>

                    <button
                      onClick={() => deleteEntryPoint(ep.id)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-red-600 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                      
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold">{editing ? 'Edit Entry Point' : 'Add Entry Point'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
  <label className="text-sm font-semibold text-slate-700">Label</label>
  <input
    value={label}
    onChange={(e) => {
      const nextLabel = e.target.value;
      setLabel(nextLabel);
      setSrc(slugifyEntrySource(nextLabel));
    }}
    placeholder="e.g. Table 3"
    className="w-full mt-1 p-3 border rounded-lg"
  />
</div>
              {/* <div>
  <label className="text-sm font-semibold text-slate-700">Source</label>
  <input
    value={src}
    readOnly
    placeholder="e.g. table_3"
    className="w-full mt-1 p-3 border rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
  />
  <p className="text-xs text-slate-400 mt-1">
    This is automatically generated from the label for tracking.
  </p>
</div> */}
            </div>
            
            <div className="px-6 pb-6 flex justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-5 py-2.5 text-slate-500 font-medium hover:bg-slate-50 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={saveEntryPoint}
                className="px-5 py-2.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800"
              >
                {editing ? 'Save' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessAdminLinks;
'use client';
import { useState } from 'react';
import { Eye, Download, Printer, Share2, Heart, Flag, Facebook, Twitter, Linkedin, MessageCircle, Mail, Link as LinkIcon, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ResourceActions({ resourceId, slug, title }: { resourceId: string; slug: string; title: string }) {
  const [favorited, setFavorited] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = typeof window !== 'undefined' ? window.location.href : '';

  async function handleFavorite() {
    try {
      const res = await fetch(`/api/favorites/${resourceId}`, { method: 'POST' });
      if (res.status === 401) { toast.error('Connectez-vous pour ajouter aux favoris'); return; }
      if (res.ok) {
        setFavorited(true);
        toast.success('Ajouté aux favoris ❤️');
      }
    } catch { toast.error('Erreur'); }
  }

  async function handleDownload() {
    try {
      const res = await fetch(`/api/resources/${resourceId}/download`, { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank');
        toast.success('Téléchargement lancé ⬇️');
      } else {
        toast.error('Erreur lors du téléchargement');
      }
    } catch { toast.error('Erreur'); }
  }

  function handlePrint() {
    window.print();
  }

  function copyLink() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Lien copié !');
    setTimeout(() => setCopied(false), 2000);
  }

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
  };

  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <button onClick={handleDownload} className="btn-primary justify-center text-sm">
          <Download className="w-4 h-4" /> Télécharger
        </button>
        <button onClick={() => window.open(`/ressources/${slug}/viewer`, '_blank')} className="btn-secondary justify-center text-sm">
          <Eye className="w-4 h-4" /> Lire en ligne
        </button>
        <button onClick={handlePrint} className="btn-secondary justify-center text-sm">
          <Printer className="w-4 h-4" /> Imprimer
        </button>
        <button onClick={handleFavorite} className={`btn-secondary justify-center text-sm ${favorited ? 'text-red-500 border-red-200 bg-red-50' : ''}`}>
          <Heart className={`w-4 h-4 ${favorited ? 'fill-red-500' : ''}`} /> {favorited ? 'Favori' : 'Favoris'}
        </button>
        <button onClick={() => setShareOpen(!shareOpen)} className="btn-secondary justify-center text-sm">
          <Share2 className="w-4 h-4" /> Partager
        </button>
        <button onClick={() => toast('Merci pour votre signalement')} className="btn-secondary justify-center text-sm">
          <Flag className="w-4 h-4" /> Signaler
        </button>
      </div>

      {shareOpen && (
        <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-sm font-semibold mb-3">Partager cette ressource</div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <a href={shareLinks.facebook} target="_blank" rel="noopener" className="flex flex-col items-center gap-1 p-3 bg-white rounded-lg hover:bg-blue-50 transition">
              <Facebook className="w-5 h-5 text-blue-600" /><span className="text-[10px] font-semibold">Facebook</span>
            </a>
            <a href={shareLinks.twitter} target="_blank" rel="noopener" className="flex flex-col items-center gap-1 p-3 bg-white rounded-lg hover:bg-sky-50 transition">
              <Twitter className="w-5 h-5 text-sky-500" /><span className="text-[10px] font-semibold">Twitter</span>
            </a>
            <a href={shareLinks.whatsapp} target="_blank" rel="noopener" className="flex flex-col items-center gap-1 p-3 bg-white rounded-lg hover:bg-green-50 transition">
              <MessageCircle className="w-5 h-5 text-green-600" /><span className="text-[10px] font-semibold">WhatsApp</span>
            </a>
            <a href={shareLinks.linkedin} target="_blank" rel="noopener" className="flex flex-col items-center gap-1 p-3 bg-white rounded-lg hover:bg-blue-50 transition">
              <Linkedin className="w-5 h-5 text-blue-700" /><span className="text-[10px] font-semibold">LinkedIn</span>
            </a>
            <a href={shareLinks.email} className="flex flex-col items-center gap-1 p-3 bg-white rounded-lg hover:bg-amber-50 transition">
              <Mail className="w-5 h-5 text-amber-600" /><span className="text-[10px] font-semibold">Email</span>
            </a>
            <button onClick={copyLink} className="flex flex-col items-center gap-1 p-3 bg-white rounded-lg hover:bg-slate-100 transition">
              {copied ? <Check className="w-5 h-5 text-green-600" /> : <LinkIcon className="w-5 h-5 text-slate-600" />}
              <span className="text-[10px] font-semibold">{copied ? 'Copié' : 'Copier'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

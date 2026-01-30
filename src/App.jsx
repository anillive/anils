import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, query, getDoc } from 'firebase/firestore';
import {
    LayoutDashboard, Wallet, TrendingUp, TrendingDown, Plus, Trash2, Save, X, Search,
    Package, Users, Briefcase, ChevronRight, Menu, Landmark, CreditCard, ShoppingCart, Minus,
    Factory, Truck, Contact, FileBarChart, CheckCircle, Clock, AlertCircle
} from 'lucide-react';

// --- Firebase Configuration & Initialization ---
// NOT: Kendi bilgisayarında kurulum yaparken bu satırı silip
// Yayınlama Rehberi'ndeki 2. Adım 6. Madde'deki kendi config ayarlarını yapıştırmalısın.
const firebaseConfig = {
    apiKey: "AIzaSyDTlbdxvFBIKLpeHmLw1AlQuG-sUxHcsns",
    authDomain: "mayel-erp.firebaseapp.com",
    projectId: "mayel-erp",
    storageBucket: "mayel-erp.firebasestorage.app",
    messagingSenderId: "131109346891",
    appId: "1:131109346891:web:3c5e58038b61c93eb4b7ce",
    measurementId: "G-ZWX6WC95KR"
};

// --- Shared Components ---

const StatCard = ({ title, value, icon: Icon, colorClass, bgClass }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between transition hover:shadow-md">
        <div>
            <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
            <h3 className={`text-2xl font-bold ${colorClass}`}>{value}</h3>
        </div>
        <div className={`p-3 rounded-full ${bgClass}`}>
            <Icon size={24} className={colorClass} />
        </div>
    </div>
);

const Modal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
                <h3 className="font-bold text-lg">{title}</h3>
                <button onClick={onClose} className="hover:bg-slate-700 p-1 rounded"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                {children}
            </div>
        </div>
    </div>
);

// --- Forms ---

const TransactionForm = ({ onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        type: 'expense', description: '', amount: '', category: '', date: new Date().toISOString().split('T')[0]
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.description || !formData.amount) return;
        onSave({ ...formData, amount: parseFloat(formData.amount) });
    };

    return (
        <Modal title="Yeni İşlem Ekle" onClose={onCancel}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <button type="button" onClick={() => setFormData({ ...formData, type: 'income' })} className={`p-3 rounded-lg font-medium flex items-center justify-center gap-2 border ${formData.type === 'income' ? 'bg-green-100 border-green-500 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}><TrendingUp size={18} /> Gelir</button>
                    <button type="button" onClick={() => setFormData({ ...formData, type: 'expense' })} className={`p-3 rounded-lg font-medium flex items-center justify-center gap-2 border ${formData.type === 'expense' ? 'bg-red-100 border-red-500 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}><TrendingDown size={18} /> Gider</button>
                </div>
                <input type="text" required className="w-full p-3 border rounded-lg" placeholder="Açıklama" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                <div className="grid grid-cols-2 gap-4">
                    <input type="number" required min="0" step="0.01" className="w-full p-3 border rounded-lg" placeholder="Tutar (TL)" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
                    <input type="date" required className="w-full p-3 border rounded-lg" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                </div>
                <select className="w-full p-3 border rounded-lg" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                    <option value="">Kategori Seç...</option>
                    {formData.type === 'income' ? <><option value="Satis">Satış</option><option value="Yatirim">Yatırım</option><option value="POS">POS Geliri</option></> : <><option value="Demirbas">Demirbaş</option><option value="Personel">Personel</option><option value="Vergi">Vergi</option><option value="Uretim">Üretim Maliyeti</option></>}
                </select>
                <button type="submit" className="w-full bg-slate-800 text-white p-3 rounded-lg font-bold hover:bg-slate-700 transition flex justify-center gap-2"><Save size={18} /> Kaydet</button>
            </form>
        </Modal>
    );
};

const InventoryForm = ({ onSave, onCancel }) => {
    const [formData, setFormData] = useState({ name: '', quantity: '', unit: 'Adet', price: '', minStock: '' });
    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ ...formData, quantity: parseInt(formData.quantity), price: parseFloat(formData.price), minStock: parseInt(formData.minStock) });
    };
    return (
        <Modal title="Yeni Ürün Ekle" onClose={onCancel}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" required className="w-full p-3 border rounded-lg" placeholder="Ürün Adı" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                <div className="grid grid-cols-2 gap-4">
                    <input type="number" required className="w-full p-3 border rounded-lg" placeholder="Stok Adedi" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} />
                    <select className="w-full p-3 border rounded-lg" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })}>
                        <option>Adet</option><option>Kg</option><option>Lt</option><option>Kutu</option><option>Metre</option>
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <input type="number" required className="w-full p-3 border rounded-lg" placeholder="Birim Fiyat (TL)" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
                    <input type="number" className="w-full p-3 border rounded-lg" placeholder="Kritik Stok" value={formData.minStock} onChange={(e) => setFormData({ ...formData, minStock: e.target.value })} />
                </div>
                <button type="submit" className="w-full bg-slate-800 text-white p-3 rounded-lg font-bold flex justify-center gap-2"><Save size={18} /> Kaydet</button>
            </form>
        </Modal>
    );
};

const PersonnelForm = ({ onSave, onCancel }) => {
    const [formData, setFormData] = useState({ name: '', role: '', salary: '', phone: '', startDate: new Date().toISOString().split('T')[0] });
    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ ...formData, salary: parseFloat(formData.salary) });
    };
    return (
        <Modal title="Yeni Personel Ekle" onClose={onCancel}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" required className="w-full p-3 border rounded-lg" placeholder="Ad Soyad" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                <input type="text" required className="w-full p-3 border rounded-lg" placeholder="Pozisyon / Görev" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} />
                <div className="grid grid-cols-2 gap-4">
                    <input type="number" required className="w-full p-3 border rounded-lg" placeholder="Maaş (TL)" value={formData.salary} onChange={(e) => setFormData({ ...formData, salary: e.target.value })} />
                    <input type="tel" className="w-full p-3 border rounded-lg" placeholder="Telefon" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <input type="date" className="w-full p-3 border rounded-lg" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
                <button type="submit" className="w-full bg-slate-800 text-white p-3 rounded-lg font-bold flex justify-center gap-2"><Save size={18} /> Kaydet</button>
            </form>
        </Modal>
    );
};

const BankForm = ({ onSave, onCancel }) => {
    const [formData, setFormData] = useState({ bankName: '', iban: '', balance: '', currency: 'TRY' });
    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ ...formData, balance: parseFloat(formData.balance) });
    };
    return (
        <Modal title="Yeni Banka Hesabı" onClose={onCancel}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" required className="w-full p-3 border rounded-lg" placeholder="Banka Adı (Örn: Ziraat)" value={formData.bankName} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })} />
                <input type="text" required className="w-full p-3 border rounded-lg" placeholder="IBAN / Hesap No" value={formData.iban} onChange={(e) => setFormData({ ...formData, iban: e.target.value })} />
                <div className="grid grid-cols-2 gap-4">
                    <input type="number" required className="w-full p-3 border rounded-lg" placeholder="İlk Bakiye" value={formData.balance} onChange={(e) => setFormData({ ...formData, balance: e.target.value })} />
                    <select className="w-full p-3 border rounded-lg" value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })}>
                        <option value="TRY">TRY</option><option value="USD">USD</option><option value="EUR">EUR</option>
                    </select>
                </div>
                <button type="submit" className="w-full bg-slate-800 text-white p-3 rounded-lg font-bold flex justify-center gap-2"><Save size={18} /> Kaydet</button>
            </form>
        </Modal>
    );
};

const ContactForm = ({ type, onSave, onCancel }) => {
    const [formData, setFormData] = useState({ name: '', company: '', phone: '', email: '', balance: '' });
    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ ...formData, balance: parseFloat(formData.balance || 0), type });
    };
    return (
        <Modal title={type === 'customer' ? 'Yeni Müşteri' : 'Yeni Tedarikçi'} onClose={onCancel}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" required className="w-full p-3 border rounded-lg" placeholder={type === 'customer' ? "Müşteri Adı" : "Tedarikçi Firma"} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                <input type="text" className="w-full p-3 border rounded-lg" placeholder="Şirket Ünvanı (Opsiyonel)" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} />
                <div className="grid grid-cols-2 gap-4">
                    <input type="tel" className="w-full p-3 border rounded-lg" placeholder="Telefon" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                    <input type="email" className="w-full p-3 border rounded-lg" placeholder="E-posta" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <input type="number" className="w-full p-3 border rounded-lg" placeholder={type === 'customer' ? "Başlangıç Alacağı (TL)" : "Başlangıç Borcu (TL)"} value={formData.balance} onChange={(e) => setFormData({ ...formData, balance: e.target.value })} />
                <button type="submit" className="w-full bg-slate-800 text-white p-3 rounded-lg font-bold flex justify-center gap-2"><Save size={18} /> Kaydet</button>
            </form>
        </Modal>
    );
};

const ProductionForm = ({ items, onSave, onCancel }) => {
    const [formData, setFormData] = useState({ itemId: '', quantity: '', note: '', status: 'planned' });
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.itemId) return;
        const selectedItem = items.find(i => i.id === formData.itemId);
        onSave({ ...formData, quantity: parseInt(formData.quantity), itemName: selectedItem?.name, date: new Date().toISOString() });
    };
    return (
        <Modal title="Yeni Üretim Emri" onClose={onCancel}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Üretilecek Ürün</label>
                    <select className="w-full p-3 border rounded-lg" value={formData.itemId} onChange={(e) => setFormData({ ...formData, itemId: e.target.value })} required>
                        <option value="">Ürün Seçiniz...</option>
                        {items.map(i => <option key={i.id} value={i.id}>{i.name} (Mevcut: {i.quantity})</option>)}
                    </select>
                </div>
                <input type="number" required className="w-full p-3 border rounded-lg" placeholder="Üretilecek Miktar" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} />
                <input type="text" className="w-full p-3 border rounded-lg" placeholder="Not / Parti No" value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} />
                <select className="w-full p-3 border rounded-lg" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    <option value="planned">Planlandı</option>
                    <option value="in_progress">İşlemde</option>
                    <option value="completed">Tamamlandı</option>
                </select>
                <button type="submit" className="w-full bg-slate-800 text-white p-3 rounded-lg font-bold flex justify-center gap-2"><Save size={18} /> Emri Oluştur</button>
            </form>
        </Modal>
    );
};

// --- View Components ---

const AccountingView = ({ user, appId }) => {
    const [transactions, setTransactions] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'transactions'));
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(b.date) - new Date(a.date));
            setTransactions(data);
        });
        return () => unsub();
    }, [user, appId]);

    const addTx = async (tx) => { await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'transactions'), { ...tx, createdAt: new Date().toISOString() }); setShowForm(false); };
    const delTx = async (id) => { if (confirm('Silinsin mi?')) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'transactions', id)); };

    const totals = useMemo(() => transactions.reduce((acc, t) => {
        const val = t.type === 'income' ? t.amount : -t.amount;
        return { ...acc, [t.type]: acc[t.type] + t.amount, balance: acc.balance + val };
    }, { income: 0, expense: 0, balance: 0 }), [transactions]);

    const filtered = transactions.filter(t => t.description.toLowerCase().includes(filter.toLowerCase()));

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Toplam Gelir" value={`₺${totals.income.toLocaleString()}`} icon={TrendingUp} colorClass="text-green-600" bgClass="bg-green-50" />
                <StatCard title="Toplam Gider" value={`₺${totals.expense.toLocaleString()}`} icon={TrendingDown} colorClass="text-red-600" bgClass="bg-red-50" />
                <StatCard title="Net Bakiye" value={`₺${totals.balance.toLocaleString()}`} icon={Wallet} colorClass="text-blue-600" bgClass="bg-blue-50" />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h2 className="text-lg font-bold flex items-center gap-2"><LayoutDashboard className="text-slate-500" /> Hareketler</h2>
                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="relative flex-grow"><Search className="absolute left-3 top-3 text-gray-400" size={16} /><input type="text" placeholder="Ara..." className="pl-10 p-2 border rounded-lg w-full" value={filter} onChange={e => setFilter(e.target.value)} /></div>
                        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-blue-700 whitespace-nowrap"><Plus size={18} /> Yeni İşlem</button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-sm"><tr><th className="p-4">Tarih</th><th className="p-4">Açıklama</th><th className="p-4 text-right">Tutar</th><th className="p-4 text-center">İşlem</th></tr></thead>
                        <tbody className="divide-y">
                            {filtered.map(t => (
                                <tr key={t.id} className="hover:bg-slate-50">
                                    <td className="p-4 text-sm text-gray-600">{t.date}</td>
                                    <td className="p-4 font-medium">{t.description} <span className="text-xs text-gray-400 block">{t.category}</span></td>
                                    <td className={`p-4 text-right font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{t.type === 'income' ? '+' : '-'} ₺{t.amount.toLocaleString()}</td>
                                    <td className="p-4 text-center"><button onClick={() => delTx(t.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={18} /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {showForm && <TransactionForm onSave={addTx} onCancel={() => setShowForm(false)} />}
        </div>
    );
};

const InventoryView = ({ user, appId }) => {
    const [items, setItems] = useState([]);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        const unsub = onSnapshot(query(collection(db, 'artifacts', appId, 'users', user.uid, 'inventory')), (s) => setItems(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => unsub();
    }, [user, appId]);

    const addItm = async (i) => { await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'inventory'), i); setShowForm(false); };
    const delItm = async (id) => { if (confirm('Silinsin mi?')) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'inventory', id)); };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Toplam Ürün Çeşidi" value={items.length} icon={Package} colorClass="text-indigo-600" bgClass="bg-indigo-50" />
                <StatCard title="Kritik Stoktaki Ürünler" value={items.filter(i => i.quantity <= i.minStock).length} icon={TrendingDown} colorClass="text-orange-600" bgClass="bg-orange-50" />
                <StatCard title="Toplam Stok Değeri" value={`₺${items.reduce((acc, i) => acc + (i.quantity * i.price), 0).toLocaleString()}`} icon={Wallet} colorClass="text-emerald-600" bgClass="bg-emerald-50" />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold flex items-center gap-2"><Package className="text-slate-500" /> Stok Listesi</h2>
                    <button onClick={() => setShowForm(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-indigo-700"><Plus size={18} /> Yeni Ürün</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-sm"><tr><th className="p-4">Ürün Adı</th><th className="p-4">Stok</th><th className="p-4">Birim Fiyat</th><th className="p-4 text-center">İşlem</th></tr></thead>
                        <tbody className="divide-y">
                            {items.map(i => (
                                <tr key={i.id} className="hover:bg-slate-50">
                                    <td className="p-4 font-medium">{i.name}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${i.quantity <= i.minStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {i.quantity} {i.unit}
                                        </span>
                                    </td>
                                    <td className="p-4">₺{i.price.toLocaleString()}</td>
                                    <td className="p-4 text-center"><button onClick={() => delItm(i.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={18} /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {showForm && <InventoryForm onSave={addItm} onCancel={() => setShowForm(false)} />}
        </div>
    );
};

const PersonnelView = ({ user, appId }) => {
    const [people, setPeople] = useState([]);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        const unsub = onSnapshot(query(collection(db, 'artifacts', appId, 'users', user.uid, 'personnel')), (s) => setPeople(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => unsub();
    }, [user, appId]);

    const addP = async (p) => { await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'personnel'), p); setShowForm(false); };
    const delP = async (id) => { if (confirm('Silinsin mi?')) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'personnel', id)); };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard title="Toplam Personel" value={people.length} icon={Users} colorClass="text-purple-600" bgClass="bg-purple-50" />
                <StatCard title="Aylık Maaş Yükü" value={`₺${people.reduce((acc, p) => acc + p.salary, 0).toLocaleString()}`} icon={Wallet} colorClass="text-pink-600" bgClass="bg-pink-50" />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold flex items-center gap-2"><Briefcase className="text-slate-500" /> Personel Listesi</h2>
                    <button onClick={() => setShowForm(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-purple-700"><Plus size={18} /> Yeni Personel</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-sm"><tr><th className="p-4">Ad Soyad</th><th className="p-4">Pozisyon</th><th className="p-4">Maaş</th><th className="p-4">Telefon</th><th className="p-4 text-center">İşlem</th></tr></thead>
                        <tbody className="divide-y">
                            {people.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50">
                                    <td className="p-4 font-medium">{p.name}</td>
                                    <td className="p-4 text-sm text-gray-600">{p.role}</td>
                                    <td className="p-4 font-bold text-gray-700">₺{p.salary.toLocaleString()}</td>
                                    <td className="p-4 text-sm text-gray-500">{p.phone}</td>
                                    <td className="p-4 text-center"><button onClick={() => delP(p.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={18} /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {showForm && <PersonnelForm onSave={addP} onCancel={() => setShowForm(false)} />}
        </div>
    );
};

const BankView = ({ user, appId }) => {
    const [accounts, setAccounts] = useState([]);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        const unsub = onSnapshot(query(collection(db, 'artifacts', appId, 'users', user.uid, 'bank_accounts')), (s) => setAccounts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => unsub();
    }, [user, appId]);

    const addAccount = async (acc) => { await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'bank_accounts'), acc); setShowForm(false); };
    const delAccount = async (id) => { if (confirm('Silinsin mi?')) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'bank_accounts', id)); };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard title="Toplam Varlık" value={`₺${accounts.reduce((acc, a) => a.currency === 'TRY' ? acc + a.balance : acc, 0).toLocaleString()}`} icon={Landmark} colorClass="text-cyan-600" bgClass="bg-cyan-50" />
                <StatCard title="Hesap Sayısı" value={accounts.length} icon={CreditCard} colorClass="text-blue-600" bgClass="bg-blue-50" />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold flex items-center gap-2"><Landmark className="text-slate-500" /> Banka Hesapları</h2>
                    <button onClick={() => setShowForm(true)} className="bg-cyan-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-cyan-700"><Plus size={18} /> Yeni Hesap</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                    {accounts.map(acc => (
                        <div key={acc.id} className="p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition bg-gradient-to-br from-white to-slate-50 relative group">
                            <button onClick={() => delAccount(acc.id)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={16} /></button>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-white border rounded-lg"><Landmark size={20} className="text-cyan-600" /></div>
                                <div>
                                    <h3 className="font-bold text-gray-800">{acc.bankName}</h3>
                                    <p className="text-xs text-gray-500 font-mono">{acc.iban}</p>
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-slate-800">{acc.balance.toLocaleString()} <span className="text-sm font-normal text-gray-500">{acc.currency}</span></div>
                            <p className="text-xs text-gray-400 mt-2">Güncel Bakiye</p>
                        </div>
                    ))}
                </div>
            </div>
            {showForm && <BankForm onSave={addAccount} onCancel={() => setShowForm(false)} />}
        </div>
    );
};

const POSView = ({ user, appId }) => {
    const [items, setItems] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const unsub = onSnapshot(query(collection(db, 'artifacts', appId, 'users', user.uid, 'inventory')), (s) => setItems(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => unsub();
    }, [user, appId]);

    const addToCart = (item) => {
        setCart(prev => {
            const existing = prev.find(p => p.id === item.id);
            if (existing) return prev.map(p => p.id === item.id ? { ...p, count: p.count + 1 } : p);
            return [...prev, { ...item, count: 1 }];
        });
    };

    const removeFromCart = (id) => {
        setCart(prev => prev.reduce((acc, item) => {
            if (item.id === id) {
                if (item.count > 1) acc.push({ ...item, count: item.count - 1 });
            } else {
                acc.push(item);
            }
            return acc;
        }, []));
    };

    const clearCart = () => setCart([]);

    const checkout = async () => {
        if (cart.length === 0) return;
        if (!confirm('Satışı onaylıyor musunuz?')) return;

        const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.count), 0);

        try {
            await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'transactions'), {
                type: 'income',
                description: `POS Satış (${cart.length} çeşit)`,
                amount: totalAmount,
                category: 'POS',
                date: new Date().toISOString().split('T')[0],
                createdAt: new Date().toISOString()
            });

            cart.forEach(async (cartItem) => {
                const inventoryItem = items.find(i => i.id === cartItem.id);
                if (inventoryItem) {
                    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'inventory', cartItem.id), {
                        quantity: inventoryItem.quantity - cartItem.count
                    });
                }
            });

            alert('Satış başarıyla tamamlandı!');
            setCart([]);
        } catch (error) {
            console.error(error);
            alert('Hata oluştu.');
        }
    };

    const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.count), 0);

    return (
        <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-100px)] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex-1 overflow-y-auto">
                <div className="sticky top-0 bg-slate-50 pt-1 pb-4 z-10">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                        <input type="text" placeholder="Ürün Ara..." className="w-full pl-10 p-3 border rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredItems.map(item => (
                        <div key={item.id} onClick={() => addToCart(item)} className={`bg-white p-4 rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition active:scale-95 flex flex-col justify-between ${item.quantity <= 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div><h4 className="font-bold text-gray-800">{item.name}</h4><p className="text-xs text-gray-500 mt-1">Stok: {item.quantity}</p></div>
                            <div className="mt-3 flex justify-between items-center"><span className="font-bold text-orange-600">₺{item.price}</span><div className="bg-orange-50 p-1.5 rounded-lg text-orange-600"><Plus size={16} /></div></div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="w-full md:w-96 bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col h-full md:h-auto md:max-h-full">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-slate-800 text-white rounded-t-2xl"><div className="flex items-center gap-2 font-bold"><ShoppingCart size={20} /> Sepet</div><button onClick={clearCart} className="text-xs text-gray-300 hover:text-white underline">Temizle</button></div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? <div className="text-center text-gray-400 mt-10">Sepetiniz boş.</div> : cart.map(item => (
                        <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div><div className="font-bold text-sm text-gray-800">{item.name}</div><div className="text-xs text-gray-500">₺{item.price} x {item.count}</div></div>
                            <div className="flex items-center gap-3"><span className="font-bold text-gray-700">₺{item.price * item.count}</span><button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Minus size={16} /></button></div>
                        </div>
                    ))}
                </div>
                <div className="p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                    <div className="flex justify-between items-center mb-4"><span className="text-gray-500">Toplam Tutar</span><span className="text-2xl font-bold text-slate-900">₺{cartTotal.toLocaleString()}</span></div>
                    <button onClick={checkout} disabled={cart.length === 0} className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center gap-2"><CreditCard size={20} /> Satışı Tamamla</button>
                </div>
            </div>
        </div>
    );
};

const ContactsView = ({ user, appId, type }) => {
    const collectionName = type === 'customer' ? 'customers' : 'suppliers';
    const [contacts, setContacts] = useState([]);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        const unsub = onSnapshot(query(collection(db, 'artifacts', appId, 'users', user.uid, collectionName)), (s) => setContacts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => unsub();
    }, [user, appId, collectionName]);

    const addContact = async (data) => { await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, collectionName), data); setShowForm(false); };
    const delContact = async (id) => { if (confirm('Silinsin mi?')) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, collectionName, id)); };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard title={type === 'customer' ? "Toplam Müşteri" : "Toplam Tedarikçi"} value={contacts.length} icon={Users} colorClass="text-blue-600" bgClass="bg-blue-50" />
                <StatCard title={type === 'customer' ? "Toplam Alacak" : "Toplam Borç"} value={`₺${contacts.reduce((acc, c) => acc + (c.balance || 0), 0).toLocaleString()}`} icon={Wallet} colorClass={type === 'customer' ? "text-green-600" : "text-red-600"} bgClass={type === 'customer' ? "bg-green-50" : "bg-red-50"} />
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold flex items-center gap-2"><Contact className="text-slate-500" /> {type === 'customer' ? 'Müşteri Listesi' : 'Tedarikçi Listesi'}</h2>
                    <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-blue-700"><Plus size={18} /> Yeni Ekle</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                    {contacts.map(c => (
                        <div key={c.id} className="p-4 border rounded-xl hover:shadow-md transition relative group bg-slate-50">
                            <button onClick={() => delContact(c.id)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                            <h3 className="font-bold text-gray-800">{c.name}</h3>
                            <p className="text-sm text-gray-500 mb-2">{c.company}</p>
                            <div className="text-xs text-gray-400 space-y-1">
                                <div>{c.phone}</div>
                                <div>{c.email}</div>
                            </div>
                            <div className={`mt-3 font-bold text-right ${type === 'customer' ? 'text-green-600' : 'text-red-600'}`}>₺{c.balance.toLocaleString()}</div>
                        </div>
                    ))}
                </div>
            </div>
            {showForm && <ContactForm type={type} onSave={addContact} onCancel={() => setShowForm(false)} />}
        </div>
    );
};

const ProductionView = ({ user, appId }) => {
    const [orders, setOrders] = useState([]);
    const [items, setItems] = useState([]);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        const unsubItems = onSnapshot(query(collection(db, 'artifacts', appId, 'users', user.uid, 'inventory')), (s) => setItems(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubOrders = onSnapshot(query(collection(db, 'artifacts', appId, 'users', user.uid, 'production')), (s) => setOrders(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => { unsubItems(); unsubOrders(); };
    }, [user, appId]);

    const addOrder = async (order) => { await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'production'), order); setShowForm(false); };

    const updateStatus = async (order, newStatus) => {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'production', order.id), { status: newStatus });
        if (newStatus === 'completed') {
            // Increase inventory
            const itemDoc = await getDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'inventory', order.itemId));
            if (itemDoc.exists()) {
                await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'inventory', order.itemId), {
                    quantity: (itemDoc.data().quantity || 0) + order.quantity
                });
            }
        }
    };

    const delOrder = async (id) => { if (confirm('Silinsin mi?')) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'production', id)); };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Planlanan" value={orders.filter(o => o.status === 'planned').length} icon={Clock} colorClass="text-amber-600" bgClass="bg-amber-50" />
                <StatCard title="Üretimde" value={orders.filter(o => o.status === 'in_progress').length} icon={Factory} colorClass="text-blue-600" bgClass="bg-blue-50" />
                <StatCard title="Tamamlanan" value={orders.filter(o => o.status === 'completed').length} icon={CheckCircle} colorClass="text-green-600" bgClass="bg-green-50" />
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold flex items-center gap-2"><Factory className="text-slate-500" /> Üretim Emirleri</h2>
                    <button onClick={() => setShowForm(true)} className="bg-amber-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-amber-700"><Plus size={18} /> Yeni Emir</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-sm"><tr><th className="p-4">Tarih</th><th className="p-4">Ürün</th><th className="p-4">Miktar</th><th className="p-4">Durum</th><th className="p-4 text-center">İşlem</th></tr></thead>
                        <tbody className="divide-y">
                            {orders.map(o => (
                                <tr key={o.id} className="hover:bg-slate-50">
                                    <td className="p-4 text-sm text-gray-500">{new Date(o.date).toLocaleDateString('tr-TR')}</td>
                                    <td className="p-4 font-medium">{o.itemName} <div className="text-xs text-gray-400">{o.note}</div></td>
                                    <td className="p-4 font-bold">{o.quantity}</td>
                                    <td className="p-4">
                                        <select
                                            value={o.status}
                                            onChange={(e) => updateStatus(o, e.target.value)}
                                            disabled={o.status === 'completed'}
                                            className={`p-1 rounded text-xs font-bold ${o.status === 'completed' ? 'bg-green-100 text-green-700' : o.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}
                                        >
                                            <option value="planned">Planlandı</option>
                                            <option value="in_progress">İşlemde</option>
                                            <option value="completed">Tamamlandı</option>
                                        </select>
                                    </td>
                                    <td className="p-4 text-center"><button onClick={() => delOrder(o.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16} /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {showForm && <ProductionForm items={items} onSave={addOrder} onCancel={() => setShowForm(false)} />}
        </div>
    );
};

const ReportsView = ({ user, appId }) => {
    const [data, setData] = useState({ income: 0, expense: 0, stockValue: 0, receivables: 0, payables: 0 });

    useEffect(() => {
        // This is a simplified fetcher. In a real app, you'd fetch collections separately and aggregation might happen server-side or carefully client-side.
        // Fetching all necessary collections for summary
        const fetchAll = async () => {
            // 1. Transactions
            let inc = 0, exp = 0;
            const qTx = query(collection(db, 'artifacts', appId, 'users', user.uid, 'transactions'));
            onSnapshot(qTx, (s) => {
                s.docs.forEach(d => { const t = d.data(); if (t.type === 'income') inc += t.amount; else exp += t.amount; });
                setData(prev => ({ ...prev, income: inc, expense: exp }));
            });

            // 2. Inventory
            const qInv = query(collection(db, 'artifacts', appId, 'users', user.uid, 'inventory'));
            onSnapshot(qInv, (s) => {
                let stk = 0; s.docs.forEach(d => { const i = d.data(); stk += (i.quantity * i.price); });
                setData(prev => ({ ...prev, stockValue: stk }));
            });

            // 3. Customers
            const qCust = query(collection(db, 'artifacts', appId, 'users', user.uid, 'customers'));
            onSnapshot(qCust, (s) => {
                let rec = 0; s.docs.forEach(d => rec += (d.data().balance || 0));
                setData(prev => ({ ...prev, receivables: rec }));
            });

            // 4. Suppliers
            const qSup = query(collection(db, 'artifacts', appId, 'users', user.uid, 'suppliers'));
            onSnapshot(qSup, (s) => {
                let pay = 0; s.docs.forEach(d => pay += (d.data().balance || 0));
                setData(prev => ({ ...prev, payables: pay }));
            });
        };
        fetchAll();
    }, [user, appId]);

    const netProfit = data.income - data.expense;
    const profitMargin = data.income > 0 ? (netProfit / data.income) * 100 : 0;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><FileBarChart className="text-slate-500" /> Yönetim Özet Raporu</h2>

            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-800 text-white p-6 rounded-xl shadow-lg">
                    <p className="text-slate-400 text-sm mb-1">Net Kâr</p>
                    <h3 className="text-3xl font-bold">₺{netProfit.toLocaleString()}</h3>
                    <div className={`text-xs mt-2 ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>% {profitMargin.toFixed(1)} Marj</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm mb-1">Toplam Stok Değeri</p>
                    <h3 className="text-2xl font-bold text-indigo-600">₺{data.stockValue.toLocaleString()}</h3>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm mb-1">Müşteri Alacakları</p>
                    <h3 className="text-2xl font-bold text-green-600">₺{data.receivables.toLocaleString()}</h3>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm mb-1">Tedarikçi Borçları</p>
                    <h3 className="text-2xl font-bold text-red-600">₺{data.payables.toLocaleString()}</h3>
                </div>
            </div>

            {/* Visual Bars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold mb-6 text-gray-700">Gelir vs Gider</h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-1"><span>Gelir</span><span className="font-bold">₺{data.income.toLocaleString()}</span></div>
                            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden"><div className="bg-green-500 h-3 rounded-full" style={{ width: `${Math.min((data.income / (data.income + data.expense || 1)) * 100, 100)}%` }}></div></div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1"><span>Gider</span><span className="font-bold">₺{data.expense.toLocaleString()}</span></div>
                            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden"><div className="bg-red-500 h-3 rounded-full" style={{ width: `${Math.min((data.expense / (data.income + data.expense || 1)) * 100, 100)}%` }}></div></div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold mb-6 text-gray-700">Nakit Akışı Tahmini</h3>
                    <div className="flex items-center justify-center h-32 text-gray-400 text-sm bg-slate-50 rounded-lg border border-dashed border-gray-200">
                        <AlertCircle size={16} className="mr-2" /> Daha fazla veri girildikçe grafik oluşacaktır.
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main Layout ---

export default function App() {
    const [user, setUser] = useState(null);
    const [view, setView] = useState('accounting');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const init = async () => {
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
            else await signInAnonymously(auth);
        };
        init();
        return onAuthStateChanged(auth, setUser);
    }, []);

    if (!user) return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500">Sistem Hazırlanıyor...</div>;

    const NavItem = ({ id, label, icon: Icon, color }) => (
        <button
            onClick={() => { setView(id); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${view === id ? `bg-${color}-50 text-${color}-700 shadow-sm border border-${color}-100` : 'text-gray-500 hover:bg-gray-100'}`}
        >
            <Icon size={20} className={view === id ? `text-${color}-600` : 'text-gray-400'} />
            {label}
            {view === id && <ChevronRight className="ml-auto opacity-50" size={16} />}
        </button>
    );

    return (
        <div className="min-h-screen bg-slate-50 font-sans flex text-slate-800">

            {/* Sidebar - Desktop */}
            <aside className="hidden md:flex w-64 bg-white border-r border-gray-100 flex-col fixed h-full z-10">
                <div className="p-6 border-b border-gray-50">
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                        <div className="bg-slate-900 text-white p-2 rounded-lg"><Wallet size={20} /></div>
                        Mayel ERP
                    </h1>
                    <p className="text-xs text-gray-400 mt-2">Kullanıcı: {user.uid.slice(0, 6)}...</p>
                </div>
                <nav className="p-4 space-y-1 flex-grow overflow-y-auto custom-scrollbar">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-2 px-4">Finans</div>
                    <NavItem id="accounting" label="Muhasebe" icon={LayoutDashboard} color="blue" />
                    <NavItem id="bank" label="Banka" icon={Landmark} color="cyan" />

                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-6 px-4">Operasyon</div>
                    <NavItem id="inventory" label="Depo & Stok" icon={Package} color="indigo" />
                    <NavItem id="production" label="Üretim" icon={Factory} color="amber" />
                    <NavItem id="pos" label="POS Satış" icon={CreditCard} color="orange" />

                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-6 px-4">Paydaşlar</div>
                    <NavItem id="customers" label="Müşteriler" icon={Users} color="green" />
                    <NavItem id="suppliers" label="Tedarikçiler" icon={Truck} color="red" />
                    <NavItem id="personnel" label="Personel" icon={Briefcase} color="purple" />

                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-6 px-4">Analiz</div>
                    <NavItem id="reports" label="Raporlar" icon={FileBarChart} color="slate" />
                </nav>
                <div className="p-4 text-xs text-center text-gray-400 border-t border-gray-50">
                    v4.0 Enterprise
                </div>
            </aside>

            {/* Sidebar - Mobile Overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)}>
                    <div className="w-64 bg-white h-full shadow-2xl p-4 overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-8">
                            <span className="font-bold text-lg">Menü</span>
                            <button onClick={() => setMobileMenuOpen(false)}><X /></button>
                        </div>
                        <nav className="space-y-1">
                            <NavItem id="accounting" label="Muhasebe" icon={LayoutDashboard} color="blue" />
                            <NavItem id="bank" label="Banka" icon={Landmark} color="cyan" />
                            <NavItem id="inventory" label="Depo & Stok" icon={Package} color="indigo" />
                            <NavItem id="production" label="Üretim" icon={Factory} color="amber" />
                            <NavItem id="pos" label="POS Satış" icon={CreditCard} color="orange" />
                            <NavItem id="customers" label="Müşteriler" icon={Users} color="green" />
                            <NavItem id="suppliers" label="Tedarikçiler" icon={Truck} color="red" />
                            <NavItem id="personnel" label="Personel" icon={Briefcase} color="purple" />
                            <NavItem id="reports" label="Raporlar" icon={FileBarChart} color="slate" />
                        </nav>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto h-screen bg-slate-50">

                {/* Mobile Header */}
                <div className="md:hidden flex justify-between items-center mb-6">
                    <h1 className="font-bold text-xl text-slate-900 flex items-center gap-2">
                        <div className="bg-slate-900 text-white p-1.5 rounded"><Wallet size={16} /></div> Mayel ERP
                    </h1>
                    <button onClick={() => setMobileMenuOpen(true)} className="p-2 bg-white border rounded-lg"><Menu /></button>
                </div>

                {/* Dynamic View */}
                <div className="max-w-7xl mx-auto h-full pb-20">
                    {view === 'accounting' && <AccountingView user={user} appId={appId} />}
                    {view === 'inventory' && <InventoryView user={user} appId={appId} />}
                    {view === 'personnel' && <PersonnelView user={user} appId={appId} />}
                    {view === 'bank' && <BankView user={user} appId={appId} />}
                    {view === 'pos' && <POSView user={user} appId={appId} />}
                    {view === 'customers' && <ContactsView user={user} appId={appId} type="customer" />}
                    {view === 'suppliers' && <ContactsView user={user} appId={appId} type="supplier" />}
                    {view === 'production' && <ProductionView user={user} appId={appId} />}
                    {view === 'reports' && <ReportsView user={user} appId={appId} />}
                </div>
            </main>

        </div>
    );
}
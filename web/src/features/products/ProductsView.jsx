import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Tag,
  DollarSign,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Filter
} from 'lucide-react';
import { useData } from '../../pos-core/contexts/DataContext';

export default function ProductsView() {
  const data = useData();
  const exchangeRate = Number(data?.exchangeRate) || 876.80;
  const products = data?.products || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Formulario de Producto
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Hamburguesas');
  const [priceUsd, setPriceUsd] = useState('');
  const [sku, setSku] = useState('');
  const [isExempt, setIsExempt] = useState(false);
  const [description, setDescription] = useState('');

  // Categorías únicas
  const categories = useMemo(() => {
    const set = new Set(['Todas']);
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtrado
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'Todas' || p.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        p.name?.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query);
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setCategory('Hamburguesas');
    setPriceUsd('');
    setSku('PRD-' + Math.floor(100 + Math.random() * 900));
    setIsExempt(false);
    setDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p) => {
    setEditingProduct(p);
    setName(p.name || '');
    setCategory(p.category || 'General');
    setPriceUsd(String(p.priceUsd || p.price || ''));
    setSku(p.sku || '');
    setIsExempt(Boolean(p.isExempt));
    setDescription(p.description || '');
    setIsModalOpen(true);
  };

  const handleSaveProduct = (e) => {
    e.preventDefault();
    if (!name.trim() || !priceUsd) return;

    const prodData = {
      id: editingProduct?.id || 'prod-' + Date.now(),
      name: name.trim(),
      category: category.trim(),
      priceUsd: Number(priceUsd),
      price: Number(priceUsd),
      sku: sku.trim(),
      isExempt,
      description: description.trim()
    };

    if (data?.saveProduct) {
      data.saveProduct(prodData);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 overflow-y-auto">
      {/* HEADER NOTION */}
      <div className="bg-white border-b border-zinc-200/80 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-zinc-100 text-zinc-700">
                <Package size={18} />
              </span>
              <h1 className="text-xl font-bold text-zinc-950 tracking-tight">Productos & Menú</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">
                {products.length} platos y bebidas
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Catálogo de venta, precios en divisa con conversión BCV y tratamiento de IVA
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
          >
            <Plus size={15} />
            <span>Nuevo Producto</span>
          </button>
        </div>

        {/* BARRA DE HERRAMIENTAS Y BÚSQUEDA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-zinc-100">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-zinc-950 text-white shadow-xs'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px]">
            <Search size={14} className="absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar producto o código SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-zinc-400"
            />
          </div>
        </div>
      </div>

      {/* TABLA DE PRODUCTOS ESTILO NOTION */}
      <div className="p-6">
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-50/80 text-zinc-500 font-semibold border-b border-zinc-100">
                <tr>
                  <th className="py-3 px-4">Código SKU</th>
                  <th className="py-3 px-4">Producto</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4 text-right">Precio ($)</th>
                  <th className="py-3 px-4 text-right">Precio BCV (Bs)</th>
                  <th className="py-3 px-4 text-center">Tratamiento IVA</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-zinc-400">
                      No se encontraron productos con el filtro aplicado.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const price = Number(p.priceUsd || p.price || 0);
                    const priceBs = price * exchangeRate;

                    return (
                      <tr key={p.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-zinc-500 font-semibold">{p.sku || 'N/A'}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-zinc-950">{p.name}</div>
                          {p.description && (
                            <div className="text-[11px] text-zinc-400 truncate max-w-xs">{p.description}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full font-semibold text-[10px] bg-zinc-100 text-zinc-700 border border-zinc-200">
                            {p.category || 'General'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-zinc-950 font-mono text-sm">
                          ${price.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-zinc-500">
                          Bs. {priceBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {p.isExempt ? (
                            <span className="px-2 py-0.5 rounded-full font-semibold text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
                              Exento (E)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full font-semibold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Gravado 16% (G)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
                            title="Editar Producto"
                          >
                            <Edit2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL CREAR / EDITAR PRODUCTO */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-bold text-zinc-950 text-base">
                  {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                </h3>
                <p className="text-xs text-zinc-500">Configuración del catálogo de venta</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Nombre del Plato / Producto</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Hamburguesa Especial"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-zinc-400 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Categoría</label>
                  <input
                    type="text"
                    required
                    placeholder="Hamburguesas"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-zinc-400"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Código SKU</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-zinc-400 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Precio en Divisas ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={priceUsd}
                    onChange={(e) => setPriceUsd(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-zinc-400 font-bold mono-num"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">Precio al Cambio BCV</label>
                  <div className="px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-500 font-mono">
                    Bs. {priceUsd ? (Number(priceUsd) * exchangeRate).toFixed(2) : '0.00'}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-zinc-900 block">Producto Exento de IVA</span>
                  <span className="text-[11px] text-zinc-500">Activar para productos no gravados según SENIAT</span>
                </div>
                <input
                  type="checkbox"
                  checked={isExempt}
                  onChange={(e) => setIsExempt(e.target.checked)}
                  className="w-4 h-4 rounded text-zinc-900 cursor-pointer"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Descripción (Opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Ingredientes, detalles de preparación..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-600 hover:bg-zinc-100 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-zinc-950 text-white font-bold hover:bg-zinc-800 transition-all cursor-pointer shadow-xs"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

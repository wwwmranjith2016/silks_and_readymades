import React, { useEffect, useState } from 'react';
import ProductForm from './ProductForm';
import LabelPrint from '../common/LabelPrint';
import { useToast } from '../common/ToastContext';

const ProductList: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLabelPrint, setShowLabelPrint] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const result = await (window as any).electron.products.getAll();
      if (result.success) {
        setProducts(result.data);
      }
    } catch (error) {
      showToast('Error loading products: ' + error, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      try {
        const result = await (window as any).electron.products.search(searchQuery);
        if (result.success) {
          setProducts(result.data);
        }
      } catch (error) {
        showToast('Error searching: ' + error, 'error');
      }
    } else {
      loadProducts();
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        const result = await (window as any).electron.products.delete(id);
        if (result.success) {
          showToast('Product deleted successfully', 'success');
          loadProducts();
        }
      } catch (error) {
        showToast('Error deleting product: ' + error, 'error');
      }
    }
  };

  const handleEdit = (product: any) => {
    setEditProduct(product);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditProduct(null);
    loadProducts();
  };

  const handlePrintLabel = (product: any) => {
    setSelectedProduct(product);
    setShowLabelPrint(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Products</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            + Add Product
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search by name, barcode, or code..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
        >
          🔍 Search
        </button>
        <button
          onClick={loadProducts}
          className="px-4 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500"
        >
          Clear
        </button>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="text-center py-8">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No products found. Click "Add Product" to create your first product.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Barcode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.product_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{product.barcode}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{product.product_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{product.category}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <span className={product.stock_quantity <= product.min_stock_level ? 'text-red-600 font-semibold' : ''}>
                      {product.stock_quantity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">₹{product.selling_price}</td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handlePrintLabel(product)}
                      className="text-green-600 hover:text-green-800 mr-3"
                    >
                      Print Label
                    </button>
                    <button
                      onClick={() => handleDelete(product.product_id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Product Form Modal */}
      {showForm && (
        <ProductForm
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowForm(false);
            setEditProduct(null);
          }}
          editProduct={editProduct}
        />
      )}

      {/* Label Print Modal */}
      {showLabelPrint && selectedProduct && (
        <LabelPrint
          product={selectedProduct}
          onClose={() => {
            setShowLabelPrint(false);
            setSelectedProduct(null);
          }}
        />
      )}


    </div>
  );
};

export default ProductList;
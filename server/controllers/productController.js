import { productService } from '../services/business/ProductService.js';
import { ok } from '../utils/apiResponse.js';
import { fail } from '../utils/apiResponse.js';

const bool = (value) => String(value).toLowerCase() === 'true' || value === true;
const number = (value) => Number(value || 0);

function publicProduct(row, images = []) {
  return {
    id: row.ProductID,
    productId: row.ProductID,
    name: row.Name,
    slug: row.Slug,
    category: row.Category,
    flavour: row.Flavor,
    flavor: row.Flavor,
    shortDescription: row.ShortDescription,
    description: row.Description,
    ingredients: String(row.Ingredients || '').split(',').map((item) => item.trim()).filter(Boolean),
    nutritionPDF: row.NutritionPDF,
    price: number(row.DiscountPrice || row.Price),
    regularPrice: number(row.Price),
    oldPrice: number(row.Price),
    discountPrice: number(row.DiscountPrice),
    weight: row.Weight,
    stock: number(row.Stock),
    featured: bool(row.Featured),
    bestSeller: bool(row.BestSeller),
    status: row.Status,
    image: row.PrimaryImage,
    primaryImage: row.PrimaryImage,
    images,
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt
  };
}

export async function getProducts(request, response) {
  const { products } = await productService.listWithImages();
  const filters = request.query;
  const mapped = products.map((product) => publicProduct(product, product.Images.sort((a, b) => number(a.SortOrder) - number(b.SortOrder)).map((image) => image.ImageURL)));
  const filtered = mapped.filter((product) => {
    if (filters.category && product.category !== filters.category) return false;
    if (filters.flavor && product.flavor !== filters.flavor) return false;
    if (filters.featured === 'true' && !product.featured) return false;
    if (filters.bestSeller === 'true' && !product.bestSeller) return false;
    if (filters.stock === 'in' && product.stock <= 0) return false;
    if (filters.minPrice && product.price < Number(filters.minPrice)) return false;
    if (filters.maxPrice && product.price > Number(filters.maxPrice)) return false;
    return true;
  });
  ok(response, { products: sortProducts(filtered, filters.sort) });
}

function sortProducts(products, sort) {
  const copy = [...products];
  if (sort === 'alpha') return copy.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'price-low') return copy.sort((a, b) => a.price - b.price);
  if (sort === 'price-high') return copy.sort((a, b) => b.price - a.price);
  if (sort === 'featured') return copy.sort((a, b) => Number(b.featured) - Number(a.featured));
  if (sort === 'best-selling') return copy.sort((a, b) => Number(b.bestSeller) - Number(a.bestSeller));
  return copy;
}

export async function searchProducts(request, response) {
  const query = String(request.query.q || '').trim().toLowerCase();
  const { products } = await productService.listWithImages();
  const mapped = products.map((product) => publicProduct(product, product.Images.map((image) => image.ImageURL)));
  const results = query ? mapped.filter((product) => [product.name, product.category, product.flavor, product.shortDescription, product.description].join(' ').toLowerCase().includes(query)) : [];
  ok(response, { products: results.slice(0, 12), suggestions: results.slice(0, 6).map((product) => product.name) });
}

export async function getSingleProduct(request, response) {
  const { products } = await productService.listWithImages({ filter: (item) => item.Slug === request.params.slug || item.ProductID === request.params.slug });
  const row = products[0];
  if (!row) return fail(response, 'Product not found.', 404, {}, 'PRODUCT_NOT_FOUND');
  ok(response, { product: publicProduct(row, row.Images.sort((a, b) => number(a.SortOrder) - number(b.SortOrder)).map((image) => image.ImageURL)) });
}

export async function getCategories(request, response) {
  const rows = await productService.listCategories();
  ok(response, { categories: rows.map((row) => ({ id: row.CategoryID, name: row.Name, slug: row.Slug, image: row.Image, description: row.Description, status: row.Status })) });
}

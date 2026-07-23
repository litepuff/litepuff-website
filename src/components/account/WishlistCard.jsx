import { FiHeart, FiShoppingBag, FiTrash2 } from "react-icons/fi";
import { fallbackProducts } from "../../utils/siteConfig";
import peri from "../../assets/images/products/peri-peri.png";
import mint from "../../assets/images/products/mint.png";
import cheese from "../../assets/images/products/cheese.png";
import cream from "../../assets/images/products/cream-onion.png";
import salt from "../../assets/images/products/salt-pepper.png";

const images = {
  "peri-peri-makhana": peri,
  "mint-pudina-makhana": mint,
  "cheese-makhana": cheese,
  "cream-onion-makhana": cream,
  "salt-pepper-makhana": salt,
};
export default function WishlistCard({ wishlist, onRemove, onMoveToCart }) {
  const items = wishlist
    .map((item) => ({
      ...item,
      product: fallbackProducts.find(
        (product) => product.id === item.productId,
      ),
    }))
    .filter((item) => item.product);
  return (
    <section
      id="wishlist"
      className="w-full min-w-0 max-w-full overflow-hidden rounded-[28px] border border-[#E9E4DA] bg-white p-5 shadow-soft sm:p-7"
    >
      <div className="mb-5">
        <p className="text-[10px] font-bold tracking-[.2em] text-[#9A7430]">
          SAVED FOR LATER
        </p>
        <h2 className="mt-1 text-3xl font-semibold">Wishlist</h2>
      </div>
      {items.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map(({ id, product }) => (
            <article
              key={id}
              className="overflow-hidden rounded-2xl border border-[#E8E3D9]"
            >
              <div className="aspect-[4/3] bg-[#F6F2E8] p-4">
                <img
                  src={images[product.id]}
                  alt={product.name}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="p-4">
                <h3 className="text-xl font-semibold">{product.name}</h3>
                <p className="mt-1 text-sm font-bold text-[#1E4D3A]">
                  ₹{product.price}
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => onMoveToCart(product, id)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#1E4D3A] px-3 py-2 text-xs font-semibold text-white"
                  >
                    <FiShoppingBag /> Move to Cart
                  </button>
                  <button
                    onClick={() => onRemove(id)}
                    aria-label="Remove from wishlist"
                    className="rounded-full border border-[#DCD7CD] p-2.5 text-[#9A392F]"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-[#F8F6F0] p-8 text-center">
          <FiHeart className="mx-auto text-[#9A7430]" size={28} />
          <p className="mt-3 font-display text-2xl font-semibold">
            Your wishlist is waiting.
          </p>
          <p className="mt-1 text-sm text-[#747C77]">
            Save your favourite flavours for another day.
          </p>
        </div>
      )}
    </section>
  );
}

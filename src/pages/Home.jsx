// src/pages/Home.jsx

import Hero from "../components/Hero";
import SignatureCollection from "../components/SignatureCollection";
import WhyLitePuff from "../components/WhyLitePuff";
import CustomersReviews from "../components/CustomerReviews";
import ProductVideo from "../components/ProductVideo";
import ShopPlatforms from "../components/ShopPlatforms";
import FinalShopCta from "../components/FinalShopCta";
import HomeStory from "../components/HomeStory";
import BrandPromise from "../components/BrandPromise";
import HomeFAQ from "../components/HomeFAQ";
import TrustStrip from "../components/TrustStrip";
import Seo from "../components/Seo";
import CampaignBanner from "../components/storefront/CampaignBanner.jsx";
const Home = () => {
  return (
    <>
      <Seo title="Premium Roasted Makhana" description="Discover LitePuff premium roasted makhana in bold flavours, crafted for lighter everyday snacking." path="/" />
      {/* Main Hero Section */}
      <Hero />
      <CampaignBanner />
      <SignatureCollection />
      <HomeStory />
      <ProductVideo />
      <WhyLitePuff />
      <CustomersReviews />
      <ShopPlatforms />
      <BrandPromise />
      <HomeFAQ />
      <FinalShopCta />
      <TrustStrip />
    </>
  );
};

export default Home;

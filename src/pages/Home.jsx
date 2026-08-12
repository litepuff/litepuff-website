// src/pages/Home.jsx

import Hero from "../components/Hero";
import FeaturedFlavours from "../components/FeaturedFlavours";
import SignatureCollection from "../components/SignatureCollection";
import WhyLitePuff from "../components/WhyLitePuff";
import CustomersReviews from "../components/CustomerReviews";
import LitePuffStory from "../components/LitePuffRitual";
import StayConnected from "../components/StayConnected";
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
      <FeaturedFlavours />
      <WhyLitePuff />
      <LitePuffStory />
      <CustomersReviews />
      <StayConnected />
    </>
  );
};

export default Home;

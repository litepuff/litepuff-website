// src/pages/Home.jsx

import Hero from "../components/Hero";
import FeaturedFlavours from "../components/FeaturedFlavours";
import SignatureCollection from "../components/SignatureCollection";
import WhyLitePuff from "../components/WhyLitePuff";
import LitePuffStory from "../components/LitePuffRitual";
import CustomersReviews from "../components/CustomerReviews";
import StayConnected from "../components/StayConnected";
import Seo from "../components/Seo";
const Home = () => {
  return (
    <>
      <Seo title="Premium Roasted Makhana" description="Discover LitePuff premium roasted makhana in bold flavours, crafted for lighter everyday snacking." path="/" />
      {/* Main Hero Section */}
      <Hero />

      {/* Our Collections */}
      <FeaturedFlavours />

      {/*SignatureCollection*/}
      <SignatureCollection />

      {/* Why LitePuff */}
      <WhyLitePuff />

      {/* LitePuff Story */}
      <LitePuffStory />

      <CustomersReviews />
      <StayConnected />
    </>
  );
};

export default Home;

const bannerImage = new URL('../assets/images/banner.png', import.meta.url).href;
const popupBannerImage = new URL('../assets/images/popup-banner.png', import.meta.url).href;

export const storefrontCampaign = Object.freeze({
  enabled: false,
  name: '',
  startDate: '',
  endDate: '',
  headline: '',
  subtitle: '',
  offer: '',
  image: bannerImage,
  mobileImage: bannerImage,
  popupImage: popupBannerImage,
  popupMobileImage: popupBannerImage,
});

export function activeCampaign(campaign = storefrontCampaign, now = new Date()) {
  if (!campaign.enabled) return null;
  const time = now.getTime();
  const starts = campaign.startDate ? new Date(campaign.startDate).getTime() : -Infinity;
  const ends = campaign.endDate ? new Date(campaign.endDate).getTime() : Infinity;
  return Number.isFinite(starts) && Number.isFinite(ends) && time >= starts && time <= ends ? campaign : null;
}

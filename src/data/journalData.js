import featuredStoryImage from '../assets/images/journals/featured-story.png';
import articleOneImage from '../assets/images/journals/article-1.png';
import articleTwoImage from '../assets/images/journals/article-2.png';
import articleThreeImage from '../assets/images/journals/article-3.png';
import articleFourImage from '../assets/images/journals/article-4.png';
import articleFiveImage from '../assets/images/journals/article-5.png';
import articleSixImage from '../assets/images/journals/article-6.png';
import snackInspirationImage from '../assets/images/journals/snack-inspiration.png';
import topicsBannerImage from '../assets/images/journals/topics-banner.png';

export const featuredArticle = {
  id: 'small-snacking-habits',
  title: 'How Small Snacking Habits Can Make A Big Difference',
  category: 'Healthy Living',
  image: featuredStoryImage,
  excerpt: 'The snacks we reach for between meals quietly shape our energy, focus and everyday rhythm. A few thoughtful choices can make those moments feel lighter and more satisfying.',
  readTime: '3 min read',
  date: 'June 28, 2026',
  slug: 'how-small-snacking-habits-can-make-a-big-difference',
};

export const journalArticles = [
  {
    id: 'desk-drawer-snacking',
    title: 'A Better Desk Drawer: Building a Smarter Afternoon Snack Ritual',
    category: 'Office Snacks',
    topics: ['Office Snacks', 'Healthy Living', 'Lifestyle'],
    image: articleOneImage,
    excerpt: 'A considered desk drawer can turn the busiest part of your day into a small moment of pause, energy and genuinely enjoyable crunch.',
    readTime: '4 min read',
    date: 'June 24, 2026',
    slug: 'building-a-smarter-afternoon-snack-ritual',
    imageHeight: 'large',
  },
  {
    id: 'chai-pairings',
    title: 'The Quiet Art of Pairing Makhana With Chai',
    category: 'Tea Time',
    topics: ['Tea Time', 'Recipes', 'Lifestyle'],
    image: articleTwoImage,
    excerpt: 'From bright mint to warm black pepper, the right flavour can make a familiar cup of chai feel newly considered.',
    readTime: '3 min read',
    date: 'June 19, 2026',
    slug: 'the-art-of-pairing-makhana-with-chai',
    imageHeight: 'medium',
  },
  {
    id: 'roasted-makhana-nutrition',
    title: 'Why Roasted Makhana Belongs in the Modern Pantry',
    category: 'Nutrition',
    topics: ['Nutrition', 'Healthy Living', 'Fitness'],
    image: articleThreeImage,
    excerpt: 'Light, versatile and naturally satisfying, roasted makhana offers a simple way to rethink the snacks we keep close at home.',
    readTime: '5 min read',
    date: 'June 14, 2026',
    slug: 'why-roasted-makhana-belongs-in-the-modern-pantry',
    imageHeight: 'medium',
  },
  {
    id: 'road-trip-snacks',
    title: 'Travel Light: Snacks Made for the Open Road',
    category: 'Travel',
    topics: ['Travel', 'Lifestyle', 'Healthy Living'],
    image: articleFourImage,
    excerpt: 'The best travel snacks are easy to share, simple to carry and satisfying enough to make the long stretch between stops feel shorter.',
    readTime: '4 min read',
    date: 'June 10, 2026',
    slug: 'travel-light-snacks-made-for-the-open-road',
    imageHeight: 'large',
  },
  {
    id: 'serving-ideas',
    title: 'Five Simple Ways to Serve Makhana Beyond the Jar',
    category: 'Recipes',
    topics: ['Recipes', 'Tea Time', 'Lifestyle'],
    image: articleFiveImage,
    excerpt: 'A few easy additions can turn roasted makhana into a generous tea-time bowl, a lively party snack or a calm evening ritual.',
    readTime: '6 min read',
    date: 'June 5, 2026',
    slug: 'five-simple-ways-to-serve-makhana',
    imageHeight: 'medium',
  },
  {
    id: 'post-workout-crunch',
    title: 'The Light Crunch We Reach for After Moving',
    category: 'Fitness',
    topics: ['Fitness', 'Nutrition', 'Healthy Living'],
    image: articleSixImage,
    excerpt: 'Post-workout snacking need not feel clinical. Balance, texture and flavour can make recovery fit more naturally into real life.',
    readTime: '3 min read',
    date: 'May 30, 2026',
    slug: 'the-light-crunch-we-reach-for-after-moving',
    imageHeight: 'medium',
  },
];

export const journalTopics = [
  'Healthy Living',
  'Recipes',
  'Nutrition',
  'Travel',
  'Office Snacks',
  'Tea Time',
  'Fitness',
  'Lifestyle',
];

export const journalImages = {
  featuredStory: featuredStoryImage,
  topicsBanner: topicsBannerImage,
  snackInspiration: snackInspirationImage,
};

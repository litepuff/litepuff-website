import featuredStoryImage from '../assets/images/journals/featured-story.png';
import articleOneImage from '../assets/images/journals/article-1.png';
import articleTwoImage from '../assets/images/journals/article-2.png';
import articleThreeImage from '../assets/images/journals/article-3.png';
import articleFourImage from '../assets/images/journals/article-4.png';
import articleFiveImage from '../assets/images/journals/article-5.png';
import articleSixImage from '../assets/images/journals/article-6.png';

export const relatedBlogArticles = [
  { title: 'Travel Light: Snacks Made for the Open Road', category: 'Travel', readTime: '4 min read', image: articleFourImage, slug: 'travel-light-snacks-made-for-the-open-road' },
  { title: 'Five Simple Ways to Serve Makhana Beyond the Jar', category: 'Recipes', readTime: '6 min read', image: articleFiveImage, slug: 'five-simple-ways-to-serve-makhana' },
  { title: 'The Light Crunch We Reach for After Moving', category: 'Fitness', readTime: '3 min read', image: articleSixImage, slug: 'the-light-crunch-we-reach-for-after-moving' },
];

export const chaiArticle = {
  slug: 'the-art-of-pairing-makhana-with-chai',
  title: 'The Art of Pairing Makhana with Chai',
  category: 'Snacking',
  readTime: '5 min read',
  published: '03 July 2026',
  introduction: 'A familiar cup of chai becomes a richer ritual when the snack beside it is considered with the same quiet care.',
  metaDescription: 'Discover the quiet art of pairing roasted makhana with chai for a lighter, more thoughtful everyday ritual.',
  heroImage: featuredStoryImage,
  editorNote: 'At LitePuff, every story is inspired by the everyday rituals that make simple moments memorable.',
  related: relatedBlogArticles,
  sections: [
    { type: 'paragraph', text: 'Morning rituals often begin with something familiar. A warm cup of chai, a quiet moment before work, or a slow weekend breakfast. At LitePuff, we believe the snacks you choose should complement these moments rather than interrupt them.' },
    { type: 'image', image: articleOneImage, alt: 'A calm morning tea and makhana ritual', caption: 'A considered start to the everyday' },
    { type: 'paragraph', text: 'Chai carries its own rhythm: spice, warmth and a little sweetness unfolding with every sip. The best pairing leaves room for those details while adding a gentle contrast in texture.' },
    { type: 'quote', text: "Great snacks don't compete with the moment. They quietly become part of it." },
    { type: 'paragraph', text: 'That is why a light roasted crunch feels so natural beside tea. It brings satisfaction without turning a quiet pause into something heavy or hurried.' },
    { type: 'heading', text: 'A Balanced Pairing' },
    { type: 'paragraph', text: 'Unlike heavily fried snacks, roasted makhana offers a lighter crunch that allows the flavours of freshly brewed chai to remain the highlight. Together they create a simple ritual that is satisfying without feeling heavy.' },
    { type: 'image', image: articleTwoImage, alt: 'Roasted makhana paired with freshly brewed chai', caption: 'Warm spice, airy crunch, quiet balance' },
    { type: 'paragraph', text: 'A bright mint flavour can lift a milky masala chai, while salt and pepper sits beautifully alongside a cleaner black tea. The pairing need not be complicated; it only needs to feel harmonious.' },
    { type: 'heading', text: 'Everyday Moments' },
    { type: 'paragraph', text: "Whether you're reading a book, working from home, travelling by train or enjoying an evening conversation, LitePuff was created for everyday rituals that deserve thoughtful snacks." },
    { type: 'image', image: articleThreeImage, alt: 'An everyday LitePuff snacking moment', caption: 'Made for the pauses between everything else' },
    { type: 'paragraph', text: 'The pleasure is in keeping things simple: a favourite cup, a flavour that suits the mood, and enough time to notice both. Small rituals rarely ask for more.' },
  ],
};

export function createArticleFromBlog(blog) {
  return {
    ...chaiArticle,
    slug: blog.slug,
    title: blog.title,
    category: blog.category || 'Journal',
    published: blog.date || (blog.createdAt ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(blog.createdAt)) : chaiArticle.published),
    readTime: blog.readTime || '5 min read',
    introduction: blog.excerpt || chaiArticle.introduction,
    metaDescription: blog.metaDescription || blog.excerpt || chaiArticle.metaDescription,
    heroImage: blog.image || chaiArticle.heroImage,
    sections: blog.content ? [{ type: 'paragraph', text: blog.content }, ...chaiArticle.sections.slice(1)] : chaiArticle.sections,
  };
}

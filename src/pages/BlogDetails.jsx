import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import BlogContent from '../components/blog/BlogContent.jsx';
import BlogHero from '../components/blog/BlogHero.jsx';
import EditorNote from '../components/blog/EditorNote.jsx';
import NewsletterCTA from '../components/blog/NewsletterCTA.jsx';
import RelatedArticles from '../components/blog/RelatedArticles.jsx';
import Seo from '../components/Seo.jsx';
import { createArticleFromBlog } from '../data/blogDetailsData.js';
import { getBlogBySlug } from '../services/blogService';

export default function BlogDetails() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadArticle() {
      const apiArticle = await getBlogBySlug(slug);
      if (active) {
        setArticle(apiArticle ? createArticleFromBlog(apiArticle) : null);
        setLoading(false);
      }
    }
    loadArticle();
    return () => { active = false; };
  }, [slug]);

  if (loading) return <div className="container-page py-16 text-sm text-[#5B625D]">Loading story...</div>;
  if (!article) return <div className="container-page py-16 text-sm text-[#5B625D]">This story is not available yet.</div>;

  return (
    <>
      <Seo title={article.title} description={article.metaDescription} path={`/blog/${article.slug}`} image={article.heroImage} />
      <main className="bg-[#FAF8F2] py-10 text-[#243029] md:py-16 lg:py-20">
        <article className="container-page max-w-5xl">
          <BlogHero article={article} />
          <BlogContent sections={article.sections} />
          <EditorNote>{article.editorNote}</EditorNote>
        </article>
        <div className="container-page max-w-5xl">
          <RelatedArticles articles={article.related} />
          <NewsletterCTA />
        </div>
      </main>
    </>
  );
}

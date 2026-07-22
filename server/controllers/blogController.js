import { blogBusinessService } from '../services/business/BlogService.js';
import { ok } from '../utils/apiResponse.js';
import { fail } from '../utils/apiResponse.js';

const bool = (value) => String(value).toLowerCase() === 'true' || value === true;

function publicBlog(row) {
  return {
    id: row.BlogID,
    blogId: row.BlogID,
    title: row.Title,
    slug: row.Slug,
    category: row.Category,
    author: row.Author,
    coverImage: row.CoverImage,
    image: row.CoverImage,
    excerpt: row.Excerpt,
    content: row.Content,
    readingTime: row.ReadingTime,
    tags: String(row.Tags || '').split(',').map((item) => item.trim()).filter(Boolean),
    featured: bool(row.Featured),
    publishedDate: row.PublishedDate,
    createdAt: row.PublishedDate,
    published: row.Status !== 'draft',
    status: row.Status
  };
}

export async function getBlogs(request, response) {
  const { rows: blogs } = await blogBusinessService.list({ filter: (blog) => blog.Status !== 'draft' });
  ok(response, { blogs: blogs.map(publicBlog) });
}

export async function getSingleBlog(request, response) {
  const blog = await blogBusinessService.sheets.readOne(blogBusinessService.sheet, (item) => item.Slug === request.params.slug || item.BlogID === request.params.slug);
  if (!blog) return fail(response, 'Blog not found.', 404, {}, 'BLOG_NOT_FOUND');
  ok(response, { blog: publicBlog(blog) });
}

import apiClient from './apiClient';

export async function getBlogs() {
  try {
    const response = await apiClient.get('/blogs');
    return response.data.blogs;
  } catch {
    return [];
  }
}

export async function getBlogBySlug(slug) {
  try {
    const response = await apiClient.get(`/blogs/${slug}`);
    return response.data.blog;
  } catch {
    return null;
  }
}

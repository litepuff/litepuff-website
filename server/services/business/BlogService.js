import { BaseBusinessService } from './BaseBusinessService.js';
import { SHEET_NAMES } from '../../config/sheets.js';
import { validateBlog } from '../../validation/domainValidation.js';

export class BlogService extends BaseBusinessService {
  constructor(dependencies = {}) { super({ sheet: SHEET_NAMES.BLOGS, primaryKey: 'BlogID', validator: validateBlog, ...dependencies }); }
  findBySlug(slug) { return this.sheets.readOne(this.sheet, (row) => row.Slug === slug); }
}
export const blogBusinessService = new BlogService();

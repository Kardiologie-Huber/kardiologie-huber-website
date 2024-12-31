// Import utilities from astro:content
import { defineCollection, z } from 'astro:content';

// Define your collection(s)
const pagesCollection = defineCollection({
  type: 'content', // or 'data' if you're storing data files
  // Optional: Add schema for content validation
  schema: z.object({
    title: z.string(),
    description: z.string(),
    slug: z.string().optional(),
    heroimage: z.string().optional(),
    herotitle: z.string().optional(),
    herodescription: z.string().optional(),
    // Add other fields as needed
  }),
});

// Export the collections object
export const collections = {
  pages: pagesCollection,
};

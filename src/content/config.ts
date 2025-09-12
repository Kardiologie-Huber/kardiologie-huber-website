// Import utilities from astro:content
import { defineCollection, z } from 'astro:content';

// Define your collection(s)
const pagesCollection = defineCollection({
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      slug: z.string().optional(),
      heroimage: image().optional(),
      heroimagedarkness: z.number().optional(),
      heroimageposition: z.string().optional(),
      herotitle: z.string().optional(),
      herosubtitle: z.string().optional(),
      herodescription: z.string().optional(),
      // Add other fields as needed
    }),
});

// Export the collections object
export const collections = {
  pages: pagesCollection,
};

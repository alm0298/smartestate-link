# SmartEstate Link

A property management and analysis tool that helps you track and analyze real estate investments.

## Features

- Property listing and management
- Automatic property analysis from pasted content
- ROI calculation with variable rates based on property characteristics
- Image fetching with CORS proxy support
- Interactive property maps

## Deployment

This project is configured for deployment on GitHub Pages.

### Setting Up GitHub Pages

1. **Set up repository secrets**:
   - Run the included script: `./setup-secrets.sh`
   - This will prompt you for the necessary environment variables
   - Alternatively, you can set them up manually in the GitHub repository settings

2. **Enable GitHub Pages**:
   - Go to your repository settings: `https://github.com/alm0298/smartestate-link/settings/pages`
   - Under "Build and deployment", select "GitHub Actions" as the source
   - The GitHub Actions workflow will automatically build and deploy your site

3. **Access your deployed site**:
   - Your site will be available at: `https://alm0298.github.io/smartestate-link/`
   - The first deployment may take a few minutes to complete

### Troubleshooting Deployment

If you encounter issues with the GitHub Actions deployment:

1. **Check workflow logs**:
   - Go to the Actions tab in your repository
   - Look for any failed workflows and review the logs

2. **Package lock issues**:
   - If you see errors related to package-lock.json mismatches, run `npm install` locally
   - Commit and push the updated package-lock.json file

3. **Environment variables**:
   - Ensure all required environment variables are set in the repository secrets
   - The workflow uses these secrets during the build process

### Local Development

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm run dev
   ```

3. Build for production:
   ```
   npm run build
   ```

## Supabase Functions

This project uses Supabase Edge Functions for backend processing:

- `analyze-content`: Analyzes property listings and extracts key information
- `proxy-image`: Provides a proxy for fetching images that might be blocked by CORS

To deploy Supabase functions:

```
cd supabase
npx supabase functions deploy analyze-content
npx supabase functions deploy proxy-image
```

## Environment Variables

Create a `.env` file with the following variables:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_API_URL=your_api_url
```

## License

MIT

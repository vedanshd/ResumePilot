# ResumePilot

A modern AI-powered resume builder with ATS scoring, LinkedIn integration, and cover letter generation.

## Features

- 📝 **AI-Powered Resume Builder** - Create professional resumes with intelligent suggestions
- 🎯 **Real-time ATS Scoring** - Get legitimate AI-powered ATS scores using Gemini AI
- 🔗 **LinkedIn Integration** - Import profiles directly from LinkedIn
- 📄 **Cover Letter Generation** - AI-generated cover letters tailored to job descriptions
- 📊 **Job Description Analysis** - Upload and analyze job descriptions for better matching
- 🎨 **Modern UI** - Clean, responsive interface with smooth animations
- 📱 **Mobile Responsive** - Works seamlessly on all devices

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **React Query** for state management
- **Shadcn/ui** for UI components

### Backend
- **Express.js** with TypeScript
- **SQLite** database with Drizzle ORM
- **WebSocket** for real-time updates
- **Gemini AI** for ATS scoring and content generation
- **PDFKit** for PDF generation

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/vedanshd/ResumePilot.git
cd ResumePilot
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your API keys:
```env
GEMINI_API_KEY=your_gemini_api_key
SCRAPINGDOG_API_KEY=your_scrapingdog_api_key
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Deployment

### Vercel Deployment

This project is optimized for Vercel deployment:

1. Push to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Environment Variables

Required environment variables for production:

- `GEMINI_API_KEY` - Google Gemini AI API key for ATS scoring
- `SCRAPINGDOG_API_KEY` - ScrapingDog API key for LinkedIn scraping (optional)

## Project Structure

```
ResumePilot/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   └── store/         # State management
├── server/                # Backend Express application
│   ├── services/          # Business logic services
│   └── routes.ts          # API routes
├── shared/                # Shared types and schemas
└── docs/                  # Documentation
```

## Features in Detail

### ATS Scoring
- Real-time AI-powered ATS analysis using Gemini AI
- Detailed breakdown of keywords, formatting, and content quality
- Actionable suggestions for improvement

### LinkedIn Integration
- Direct profile import from LinkedIn URLs
- Automatic data parsing and formatting
- Fallback mock data for testing

### Cover Letter Generation
- AI-generated cover letters based on resume and job description
- Professional templates and formatting
- PDF export functionality

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with ❤️ by [Vedansh Dhawan](https://github.com/vedanshd)
- Powered by Google Gemini AI
- UI components by Shadcn/ui
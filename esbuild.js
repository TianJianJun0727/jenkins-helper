const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * Copy static assets to dist folder
 */
function copyAssets() {
	const imagesDir = path.join(__dirname, 'images');
	const distImagesDir = path.join(__dirname, 'dist', 'images');

	// Create dist/images directory if it doesn't exist
	if (!fs.existsSync(distImagesDir)) {
		fs.mkdirSync(distImagesDir, { recursive: true });
	}

	// Copy all files from images to dist/images
	const files = fs.readdirSync(imagesDir);
	files.forEach(file => {
		const srcPath = path.join(imagesDir, file);
		const destPath = path.join(distImagesDir, file);
		fs.copyFileSync(srcPath, destPath);
	});

	console.log('[assets] copied images to dist/images');
}

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
			copyAssets();
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				console.error(`    ${location.file}:${location.line}:${location.column}:`);
			});
			console.log('[watch] build finished');
		});
	},
};

async function main() {
	// Copy assets before build
	copyAssets();

	const ctx = await esbuild.context({
		entryPoints: [
			'src/extension.ts'
		],
		bundle: true,
		format: 'cjs',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outfile: 'dist/extension.js',
		external: ['vscode'],
		logLevel: 'silent',
		plugins: [
			/* add to the end of plugins array */
			esbuildProblemMatcherPlugin,
		],
	});
	if (watch) {
		await ctx.watch();
	} else {
		await ctx.rebuild();
		await ctx.dispose();
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});

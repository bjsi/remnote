const less = require("less");
const fs = require("fs");
const { variants } = require("@catppuccin/palette");
const { execSync } = require("child_process");

const themes = ["latte", "frappe", "macchiato", "mocha"];

let masterTheme = fs.readFileSync("../public/theme.less", "utf8");

fs.mkdir("built", { recursive: true }, (err) => {
	if (err && err.code !== "EEXIST") {
		throw err;
	}
});

function formTheme(theme) {
	// replace appearance with .light or .dark
	let themeData = masterTheme.replace(
		/"appearance"/g,
		theme === "latte" ? ".light" : ".dark"
	);

	const accent = "blue";

	// prepend the color palette to the less file
	let palette = "";

	for (const colorName in variants[theme]) {
		let color = variants[theme][colorName];
		palette += `@${colorName}-raw: ${color.raw};\n`;
		palette += `@${colorName}-hsl: ${color.hsl};\n`;
		palette += `@${colorName}-rgb: ${color.rgb};\n`;
		palette += `@${colorName}: ${color.hex};\n`;
	}

	const accentColor = variants[theme][accent];
	palette += `@accent-raw: ${accentColor.raw};\n`;
	palette += `@accent-hsl: ${accentColor.hsl};\n`;
	palette += `@accent-rgb: ${accentColor.rgb};\n`;
	palette += `@accent: ${accentColor.hex};\n`;

	themeData = palette + themeData;

	let output = "";

	// compile the less file
	return new Promise((resolve, reject) => {
		// compile the less file
		less.render(themeData, (err, output) => {
			if (err) {
				reject(err);
			} else {
				resolve(output.css);
			}
		});
	});
}

function getCurrentGitTag() {
	try {
		const tag = execSync("git describe --tags --abbrev=0")
			.toString()
			.trim()
			.replace("v", "");
		return ([major, minor, patch] = tag.split("."));
	} catch (error) {
		console.error("Error getting git tag:", error);
		return null;
	}
}

function formManifest(theme) {
	// version needs to look like this:
	// 	"version": {
	// 	"major": 0,
	// 	"minor": 4,
	// 	"patch": 0
	// },
	let version; // this needs to end up as a string that looks like { "major": 0, "minor": 4, "patch": 0}
	// get version from git tag
	let gitVersion = getCurrentGitTag();
	version = `{
		"major": ${gitVersion[0]},
		"minor": ${gitVersion[1]},
		"patch": ${gitVersion[2]}
	}`;
	let manifest = fs
		.readFileSync("src/manifest.template.json", "utf8")
		.replace(/<theme name>/g, theme)
		.replace(/<appearance>/g, theme === "latte" ? "light" : "dark")
		.replace(/<theme name cap>/g, theme[0].toUpperCase() + theme.slice(1))
		.replace(/"<version>"/g, version)
		.replace(/<authors>/g, "justTOBBI, coldenate");

	return manifest;
}

function getLogo(theme) {
	return theme === "latte" ? "src/wlogo.png" : "src/logo.png";
}

//

// iterate through themes
// run the fuinction to form the theme
themes.forEach(async (theme) => {
	try {
		let themeFile = await formTheme(theme);

		let manifest = formManifest(theme);
		let logo = getLogo(theme);

		console.log("Creating theme folder");

		const dir = "built/" + theme;
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir);
		}

		console.log("Writing CSS file to theme folder");
		fs.writeFile("built/" + theme + "/theme.css", themeFile, (err) => {
			console.log("Copying manifest.json to theme folder");
			fs.writeFileSync("built/" + theme + "/manifest.json", manifest);

			console.log("Copying logo.png to theme folder");
			fs.copyFile(logo, "built/" + theme + "/logo.png", (err) => {
				if (err) {
					console.error(err);
					return;
				}
			});
			console.log("Copy README.md to theme folder");
			fs.copyFile("README.md", "built/" + theme + "/README.md", (err) => {
				if (err) {
					console.error(err);
					return;
				}
			});
		});
	} catch (err) {
		console.error(err);
	}
});

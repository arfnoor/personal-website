# Personal site

A plain HTML/CSS/JS site with no build step, so GitHub Pages can serve it as-is.

```
index.html        About (bio, education, skills)
experience.html   Work experience, one role per screen
projects.html     Projects, one per screen, with phone demos
style.css         All styling (colors and fonts are variables at the top)
main.js           Section transitions and the "1 / 3" counter
phone-demo.js     Scales and loads the phone demos
demos/todo/       A sample demo app, replace with your own
```

## Preview locally

Phone demos load as JavaScript modules, which browsers block on `file://`
URLs, so use a local server:

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploy to GitHub Pages

1. Create a repository (name it `your-username.github.io` for a root URL, or any name for `your-username.github.io/repo-name`).
2. Put all of these files at the top level of the repository and push to `main`.
3. In the repository, go to Settings, then Pages. Under "Build and deployment" choose "Deploy from a branch", pick `main` and `/ (root)`, and save.
4. After a minute the site is live at the URL shown on that page.

All links are relative, so it works under a repo-name path too.

## Editing content

Replace the "Adam Noor" placeholders and sample text in the three HTML files.
Each `<section class="section">` is one full screen. Copy a section to add
another. The `style="--i:N"` on each `reveal` element sets the order in which
things fade in (0 first).

To restyle, change the variables at the top of `style.css` (`--bg`, `--fg`,
`--muted`, `--rule`, `--font`).

## Adding a phone demo

The phone screen is a fixed 390 x 844 virtual screen that is scaled down to fit
the frame, so you can build your demo as if it were a normal phone screen.

1. Create `demos/my-app/demo.js` exporting a `mount` function:

   ```js
   export function mount(root) {
     root.innerHTML = "<h1>Hello</h1>"; // or render a framework app into root
     return () => root.replaceChildren(); // optional cleanup
   }
   ```

2. On the phone screen in `projects.html`, set `data-demo="my-app"`:

   ```html
   <div class="phone-screen" data-demo="my-app">
   ```

The demo loads the first time that project scrolls near the screen. If your app
already has a web build (Flutter web, Expo web, and so on), you can also put an
`<iframe src="demos/my-app/index.html" style="width:100%;height:100%;border:0">`
into `.phone-viewport`.

For a project with a screenshot instead of a phone, use the `media-frame` block
in the second project as the template.

## Add a résumé

The About page links to `resume.pdf`. Add that file next to `index.html`, or
remove the link.

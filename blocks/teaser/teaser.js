/**
 * Teaser Block — two-column layout with optional CTA button
 *
 * Content model (7 rows, 1 col each — xwalk field-per-row):
 *   Row 0: eyebrow (<p><strong>text</strong></p> or <p>text</p>)
 *   Row 1: title (<h3>heading</h3>)
 *   Row 2: description (<p>text</p>)
 *   Row 3: buttonText (<p>text</p>)
 *   Row 4: buttonURL (<p><a href="...">url</a></p> or <p>url</p>)
 *   Row 5: buttonType (<p>primary|secondary|link-external</p>)
 *   Row 6: clickType (<p>_self|_blank</p>)
 *   Row 7: ariaLabel (<p>text</p>)
 *
 * Decorated structure:
 *   .teaser
 *     .teaser-eyebrow           (above both columns)
 *     .teaser-content  (flex row)
 *       .teaser-left   (title)
 *       .teaser-right  (description + optional button)
 */
export default function decorate(block) {
  const rows = block.querySelectorAll(':scope > div');
  if (rows.length < 3) return;

  // Extract eyebrow from row 0, display above content
  // Support both <p><strong>text</strong></p> (local) and <p>text</p> (AEM author)
  const eyebrowText = rows[0].querySelector('p > strong')?.textContent
    || rows[0].querySelector('p')?.textContent
    || rows[0].textContent?.trim();
  if (eyebrowText) {
    const eyebrowDiv = document.createElement('div');
    eyebrowDiv.classList.add('teaser-eyebrow');
    eyebrowDiv.setAttribute('role', 'heading');
    eyebrowDiv.setAttribute('aria-level', '2');
    eyebrowDiv.textContent = eyebrowText;
    block.insertBefore(eyebrowDiv, rows[0]);
  }
  rows[0].remove();

  // Extract button fields (rows 3, 4, 5) and aria-label (row 6) before rearranging
  const buttonText = rows[3]?.textContent?.trim() || '';
  const buttonURLEl = rows[4]?.querySelector('a');
  const buttonURL = buttonURLEl?.href || rows[4]?.textContent?.trim() || '';
  const buttonType = rows[5]?.textContent?.trim() || '';
  const clickType = rows[6]?.textContent?.trim() || '_self';
  const ariaLabel = rows[7]?.textContent?.trim() || '';

  // Remove extra rows from DOM (reverse order to preserve indices)
  if (rows[7]) rows[7].remove();
  if (rows[6]) rows[6].remove();
  if (rows[5]) rows[5].remove();
  if (rows[4]) rows[4].remove();
  if (rows[3]) rows[3].remove();

  // Wrap title (row 1) and description (row 2) in a flex container
  const contentDiv = document.createElement('div');
  contentDiv.classList.add('teaser-content');

  rows[1].classList.add('teaser-left');
  rows[2].classList.add('teaser-right');

  const heading = rows[1].querySelector('h1, h2, h3, h4, p');
  if (heading) {
    heading.classList.add('teaser-title');
    heading.setAttribute('role', 'heading');
    heading.setAttribute('aria-level', '3');
  }

  rows[2].querySelectorAll('p').forEach((p) => {
    p.classList.add('teaser-description');
  });

  // Apply aria-label to the block for accessibility
  if (ariaLabel) {
    block.setAttribute('role', 'region');
    block.setAttribute('aria-labelledby', eyebrowText);
  }

  // Add button to the description column if button text and URL exist
  if (buttonText && buttonURL) {
    const buttonP = document.createElement('p');
    buttonP.classList.add('button-container');
    const link = document.createElement('a');
    link.href = buttonURL;
    link.textContent = buttonText;
    link.target = clickType;
    link.classList.add('button');
    link.setAttribute('aria-label', ariaLabel);
    if (buttonType) link.classList.add(buttonType);
    if (clickType === '_blank' || buttonType === 'link-external') {
      link.rel = 'noopener noreferrer';
    }
    buttonP.appendChild(link);
    rows[2].appendChild(buttonP);
  }

  contentDiv.appendChild(rows[1]);
  contentDiv.appendChild(rows[2]);
  block.appendChild(contentDiv);
}

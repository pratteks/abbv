# Embed Form Block

This block allows you to embed AEM adaptive forms into your web pages using their published paths.

## Usage

To use the Embed Form block, add it to your page with the following structure:

```html
<div class="embed-form">
  <div>
    <div>Form Path</div>
    <div>/content/forms/af/myform.html</div>
  </div>
</div>
```

## Configuration

The Embed Form block supports the following configuration options:

### Required

- **Form Path**: The path to the published adaptive form (e.g., `/content/forms/af/myform.html`)

### Optional

- **Theme Path**: Optional path to a custom theme for the form
- **Submit Endpoint**: Optional custom endpoint for form submission

## Cross-Domain Considerations

When embedding forms from a different domain, ensure that:

1. The AEM server is configured to allow cross-domain requests (CORS)
2. The Apache Sling Referrer Filter is configured to allow your domain

To configure the AEM server:

1. Go to AEM Web Console Configuration Manager at `https://[server]:[port]/system/console/configMgr`
2. Locate and open the Apache Sling Referrer Filter configuration
3. In the Allowed Hosts field, specify your domain

## Events

The block dispatches the following events:

- `adaptiveform:loaded`: Fired when the form has been successfully loaded
- `adaptiveform:error`: Fired when there was an error loading the form

## Example

```javascript
// Listen for form loaded event
document.addEventListener('adaptiveform:loaded', (event) => {
  console.log('Form loaded:', event.detail.formPath);
});

// Listen for form error event
document.addEventListener('adaptiveform:error', (event) => {
  console.error('Form error:', event.detail.error);
});

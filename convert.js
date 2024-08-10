const fs = require('fs');
const path = require('path');
const parseString = require('xml2js').parseString;

const xml = `
// Paste your XML content here
`;

parseString(xml, (err, result) => {
    if (err) {
        console.error('Error parsing XML:', err);
        return;
    }

    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const items = result.rss.channel[0].item;
    items.forEach(item => {
        const postType = item['wp:post_type'] ? item['wp:post_type'][0] : null;

        // Skip if post type is attachment
        if (postType === 'attachment') {
            console.log(`Skipping attachment: ${item.title[0]}`);
            return;
        }

        const title = item.title[0];
        const description = title; // Use title as description

        // Check and format pubDate, set to "Invalid Date" if not valid
        const rawPubDate = item.pubDate ? item.pubDate[0] : null;
        let pubDate;
        try {
            pubDate = rawPubDate ? new Date(rawPubDate).toISOString().replace('T', ' ').slice(0, 19) : 'Invalid Date';
        } catch (e) {
            console.error(`Invalid date for item "${title}":`, rawPubDate);
            pubDate = 'Invalid Date';
        }

        // Extract category and use the first one
        const categories = item.category ? item.category.filter(cat => cat.$.domain === 'category').map(cat => cat._) : [];
        const category = categories.length > 0 ? categories[0] : 'uncategorized';

        // Extract tags
        const tags = item.category ? item.category.filter(cat => cat.$.domain === 'post_tag').map(cat => cat._) : [];

        // Extract image URL from content:encoded
        const contentEncoded = item['content:encoded'][0];
        const imageUrlMatch = contentEncoded.match(/<img[^>]+src="([^">]+)"/);
        const imageUrl = imageUrlMatch ? imageUrlMatch[1] : '';
        const banner = imageUrl ? `@images/${imageUrl.replace(/^.*?\/wp-content\/uploads\//, '')}` : '@images/maxsi-pay.webp';

        // Extract all content from content:encoded
        const content = item['content:encoded'].map(encodedContent =>
            encodedContent.replace(/<!\[CDATA\[|\]\]>/g, '').trim()
        ).join('\n\n');

        // Prepare Markdown content, make banner optional
        const markdownContent = `
---
title: "${title}"
description: "${description}"
pubDate: "${pubDate}"
category: "${category}"
banner: "${banner}"
tags: ${JSON.stringify(tags)}
selected: true
---

${content}
        `.trim();

        // Use only one hyphen for filename
        const fileName = `${title.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()}.md`;
        fs.writeFileSync(path.join(outputDir, fileName), markdownContent);
        console.log(`File created: ${fileName}`);
    });
});

import pg from 'pg';
const { Client } = pg;

async function updateProductSKUs() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    
    // Get all products ordered by ID
    const { rows } = await client.query('SELECT id FROM products ORDER BY id');
    
    // Update each product with a sequential SKU
    for (let i = 0; i < rows.length; i++) {
      const id = rows[i].id;
      const newSku = String(i + 1).padStart(8, '0'); // Format as 00000001, 00000002, etc.
      
      await client.query(
        'UPDATE products SET sku =  WHERE id = ',
        [newSku, id]
      );
      
      console.log();
    }
    
    console.log('All product SKUs have been updated successfully!');
  } catch (error) {
    console.error('Error updating product SKUs:', error);
  } finally {
    await client.end();
  }
}

updateProductSKUs();

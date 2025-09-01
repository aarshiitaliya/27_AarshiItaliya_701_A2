const mongoose = require('mongoose');
require('dotenv').config();

const Category = require('../models/Category');
const Product = require('../models/Product');
const Admin = require('../models/Admin');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('✅ Connected to MongoDB for seeding');
    seedDatabase();
})
.catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
});

async function seedDatabase() {
    try {
        console.log('🌱 Starting database seeding...');
        
        // Clear existing data
        await Promise.all([
            Category.deleteMany({}),
            Product.deleteMany({}),
            Admin.deleteMany({})
        ]);
        console.log('🗑️  Cleared existing data');
        
        // Create default admin
        await Admin.createDefaultAdmin();
        console.log('👤 Created default admin');
        
        // Create categories
        const categories = await createCategories();
        console.log('📂 Created categories');
        
        // Create products
        await createProducts(categories);
        console.log('📦 Created products');
        
        console.log('✅ Database seeding completed successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔐 Admin Login Credentials:');
        console.log(`   Email: ${process.env.ADMIN_EMAIL || 'admin@shoppingcart.com'}`);
        console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding error:', error);
        process.exit(1);
    }
}

async function createCategories() {
    const categoryData = [
        // Level 1 Categories (Main Categories)
        {
            name: 'Electronics',
            description: 'Electronic devices and gadgets',
            level: 1,
            sortOrder: 1,
            image: '/images/categories/electronics.jpg'
        },
        {
            name: 'Clothing',
            description: 'Fashion and apparel for all',
            level: 1,
            sortOrder: 2,
            image: '/images/categories/clothing.jpg'
        },
        {
            name: 'Home & Garden',
            description: 'Home improvement and garden supplies',
            level: 1,
            sortOrder: 3,
            image: '/images/categories/home-garden.jpg'
        },
        {
            name: 'Sports & Fitness',
            description: 'Sports equipment and fitness gear',
            level: 1,
            sortOrder: 4,
            image: '/images/categories/sports.jpg'
        },
        {
            name: 'Books & Media',
            description: 'Books, movies, music and more',
            level: 1,
            sortOrder: 5,
            image: '/images/categories/books.jpg'
        }
    ];
    
    const mainCategories = [];
    for (const data of categoryData) {
        const category = new Category(data);
        await category.save();
        mainCategories.push(category);
    }
    
    // Level 2 Categories (Subcategories)
    const subcategoryData = [
        // Electronics subcategories
        {
            name: 'Smartphones',
            description: 'Mobile phones and accessories',
            level: 2,
            parent: mainCategories[0]._id,
            sortOrder: 1
        },
        {
            name: 'Laptops',
            description: 'Laptops and notebooks',
            level: 2,
            parent: mainCategories[0]._id,
            sortOrder: 2
        },
        {
            name: 'Headphones',
            description: 'Audio devices and headphones',
            level: 2,
            parent: mainCategories[0]._id,
            sortOrder: 3
        },
        {
            name: 'Gaming',
            description: 'Gaming consoles and accessories',
            level: 2,
            parent: mainCategories[0]._id,
            sortOrder: 4
        },
        
        // Clothing subcategories
        {
            name: 'Men\'s Clothing',
            description: 'Clothing for men',
            level: 2,
            parent: mainCategories[1]._id,
            sortOrder: 1
        },
        {
            name: 'Women\'s Clothing',
            description: 'Clothing for women',
            level: 2,
            parent: mainCategories[1]._id,
            sortOrder: 2
        },
        {
            name: 'Shoes',
            description: 'Footwear for all occasions',
            level: 2,
            parent: mainCategories[1]._id,
            sortOrder: 3
        },
        {
            name: 'Accessories',
            description: 'Fashion accessories',
            level: 2,
            parent: mainCategories[1]._id,
            sortOrder: 4
        },
        
        // Home & Garden subcategories
        {
            name: 'Furniture',
            description: 'Home and office furniture',
            level: 2,
            parent: mainCategories[2]._id,
            sortOrder: 1
        },
        {
            name: 'Kitchen',
            description: 'Kitchen appliances and tools',
            level: 2,
            parent: mainCategories[2]._id,
            sortOrder: 2
        },
        {
            name: 'Garden Tools',
            description: 'Gardening equipment and tools',
            level: 2,
            parent: mainCategories[2]._id,
            sortOrder: 3
        },
        {
            name: 'Home Decor',
            description: 'Decorative items for home',
            level: 2,
            parent: mainCategories[2]._id,
            sortOrder: 4
        },
        
        // Sports & Fitness subcategories
        {
            name: 'Fitness Equipment',
            description: 'Exercise and fitness gear',
            level: 2,
            parent: mainCategories[3]._id,
            sortOrder: 1
        },
        {
            name: 'Outdoor Sports',
            description: 'Outdoor sports equipment',
            level: 2,
            parent: mainCategories[3]._id,
            sortOrder: 2
        },
        {
            name: 'Team Sports',
            description: 'Equipment for team sports',
            level: 2,
            parent: mainCategories[3]._id,
            sortOrder: 3
        },
        
        // Books & Media subcategories
        {
            name: 'Fiction Books',
            description: 'Novels and fiction literature',
            level: 2,
            parent: mainCategories[4]._id,
            sortOrder: 1
        },
        {
            name: 'Non-Fiction',
            description: 'Educational and reference books',
            level: 2,
            parent: mainCategories[4]._id,
            sortOrder: 2
        },
        {
            name: 'Movies & TV',
            description: 'DVDs, Blu-rays and digital media',
            level: 2,
            parent: mainCategories[4]._id,
            sortOrder: 3
        }
    ];
    
    const subcategories = [];
    for (const data of subcategoryData) {
        const category = new Category(data);
        await category.save();
        subcategories.push(category);
    }
    
    return {
        main: mainCategories,
        sub: subcategories
    };
}

async function createProducts(categories) {
    const products = [
        // Electronics - Smartphones
        {
            name: 'iPhone 15 Pro',
            description: 'Latest iPhone with advanced camera system and A17 Pro chip. Features titanium design, Action Button, and USB-C connectivity.',
            shortDescription: 'Premium smartphone with titanium design and advanced camera',
            price: 134900,
            comparePrice: 139900,
            category: categories.sub[0]._id,
            images: [
                { url: '/images/products/iphone-15-pro.jpg', alt: 'iPhone 15 Pro', isPrimary: true }
            ],
            inventory: { trackQuantity: true, quantity: 25 },
            featured: true,
            tags: ['smartphone', 'apple', 'premium'],
            status: 'active'
        },
        {
            name: 'Samsung Galaxy S24 Ultra',
            description: 'Flagship Android smartphone with S Pen, advanced AI features, and exceptional camera capabilities.',
            shortDescription: 'Premium Android smartphone with S Pen and AI features',
            price: 129999,
            comparePrice: 134999,
            category: categories.sub[0]._id,
            images: [
                { url: '/images/products/galaxy-s24-ultra.jpg', alt: 'Samsung Galaxy S24 Ultra', isPrimary: true }
            ],
            inventory: { trackQuantity: true, quantity: 30 },
            featured: true,
            tags: ['smartphone', 'samsung', 'android'],
            status: 'active'
        },
        
        // Electronics - Laptops
        {
            name: 'MacBook Pro 16-inch M3',
            description: 'Professional laptop with M3 chip, Liquid Retina XDR display, and all-day battery life. Perfect for creative professionals.',
            shortDescription: 'Professional laptop with M3 chip and XDR display',
            price: 249900,
            comparePrice: 259900,
            category: categories.sub[1]._id,
            images: [
                { url: '/images/products/macbook-pro-16.jpg', alt: 'MacBook Pro 16-inch', isPrimary: true }
            ],
            inventory: { trackQuantity: true, quantity: 15 },
            featured: true,
            tags: ['laptop', 'apple', 'professional'],
            status: 'active'
        },
        {
            name: 'Dell XPS 13',
            description: 'Ultra-portable laptop with InfinityEdge display, Intel Core processors, and premium build quality.',
            shortDescription: 'Ultra-portable laptop with premium design',
            price: 89999,
            comparePrice: 94999,
            category: categories.sub[1]._id,
            images: [
                { url: '/images/products/dell-xps-13.jpg', alt: 'Dell XPS 13', isPrimary: true }
            ],
            inventory: { trackQuantity: true, quantity: 20 },
            tags: ['laptop', 'dell', 'ultrabook'],
            status: 'active'
        },
        
        // Electronics - Headphones
        {
            name: 'Sony WH-1000XM5',
            description: 'Industry-leading noise canceling wireless headphones with exceptional sound quality and 30-hour battery life.',
            shortDescription: 'Premium noise-canceling wireless headphones',
            price: 29990,
            comparePrice: 34990,
            category: categories.sub[2]._id,
            images: [
                { url: '/images/products/sony-wh1000xm5.jpg', alt: 'Sony WH-1000XM5', isPrimary: true }
            ],
            inventory: { trackQuantity: true, quantity: 40 },
            featured: true,
            tags: ['headphones', 'sony', 'wireless', 'noise-canceling'],
            status: 'active'
        },
        
        // Clothing - Men's
        {
            name: 'Classic Cotton T-Shirt',
            description: 'Premium quality cotton t-shirt with comfortable fit. Available in multiple colors and sizes.',
            shortDescription: 'Premium cotton t-shirt with comfortable fit',
            price: 999,
            comparePrice: 1299,
            category: categories.sub[4]._id,
            images: [
                { url: '/images/products/cotton-tshirt.jpg', alt: 'Cotton T-Shirt', isPrimary: true }
            ],
            inventory: { trackQuantity: true, quantity: 100 },
            tags: ['t-shirt', 'cotton', 'casual'],
            status: 'active'
        },
        {
            name: 'Denim Jeans',
            description: 'Classic fit denim jeans made from premium denim fabric. Durable and stylish for everyday wear.',
            shortDescription: 'Classic fit denim jeans',
            price: 2499,
            comparePrice: 2999,
            category: categories.sub[4]._id,
            images: [
                { url: '/images/products/denim-jeans.jpg', alt: 'Denim Jeans', isPrimary: true }
            ],
            inventory: { trackQuantity: true, quantity: 75 },
            tags: ['jeans', 'denim', 'casual'],
            status: 'active'
        },
        
        // Clothing - Women's
        {
            name: 'Floral Summer Dress',
            description: 'Beautiful floral print summer dress made from lightweight, breathable fabric. Perfect for warm weather.',
            shortDescription: 'Lightweight floral print summer dress',
            price: 1899,
            comparePrice: 2299,
            category: categories.sub[5]._id,
            images: [
                { url: '/images/products/floral-dress.jpg', alt: 'Floral Summer Dress', isPrimary: true }
            ],
            inventory: { trackQuantity: true, quantity: 50 },
            featured: true,
            tags: ['dress', 'floral', 'summer'],
            status: 'active'
        },
        
        // Home & Garden - Kitchen
        {
            name: 'Stainless Steel Cookware Set',
            description: 'Professional-grade stainless steel cookware set with non-stick coating. Includes pots, pans, and utensils.',
            shortDescription: 'Professional stainless steel cookware set',
            price: 8999,
            comparePrice: 10999,
            category: categories.sub[9]._id,
            images: [
                { url: '/images/products/cookware-set.jpg', alt: 'Cookware Set', isPrimary: true }
            ],
            inventory: { trackQuantity: true, quantity: 25 },
            tags: ['cookware', 'kitchen', 'stainless-steel'],
            status: 'active'
        },
        
        // Sports & Fitness
        {
            name: 'Yoga Mat Premium',
            description: 'High-quality yoga mat with excellent grip and cushioning. Perfect for yoga, pilates, and other exercises.',
            shortDescription: 'Premium yoga mat with excellent grip',
            price: 1499,
            comparePrice: 1899,
            category: categories.sub[12]._id,
            images: [
                { url: '/images/products/yoga-mat.jpg', alt: 'Yoga Mat', isPrimary: true }
            ],
            inventory: { trackQuantity: true, quantity: 60 },
            tags: ['yoga', 'fitness', 'exercise'],
            status: 'active'
        },
        
        // Books
        {
            name: 'The Complete Guide to Web Development',
            description: 'Comprehensive guide covering HTML, CSS, JavaScript, and modern web frameworks. Perfect for beginners and professionals.',
            shortDescription: 'Complete web development guide',
            price: 899,
            comparePrice: 1199,
            category: categories.sub[16]._id,
            images: [
                { url: '/images/products/web-dev-book.jpg', alt: 'Web Development Book', isPrimary: true }
            ],
            inventory: { trackQuantity: true, quantity: 40 },
            tags: ['book', 'programming', 'web-development'],
            status: 'active'
        }
    ];
    
    for (const productData of products) {
        const product = new Product(productData);
        await product.save();
    }
}

// Handle process termination
process.on('SIGINT', () => {
    mongoose.connection.close(() => {
        console.log('\n🔌 MongoDB connection closed');
        process.exit(0);
    });
});

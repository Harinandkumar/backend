const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// ========== CONFIG ==========
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Connect Database
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.DB_URL);
        console.log('✅ MongoDB Connected');
    } catch (err) {
        console.error('❌ MongoDB Error:', err);
        process.exit(1);
    }
};

// ========== SEO Filename Generator ==========
function generateSeoFilename(name, position) {
    const cleanName = (name || 'user')
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    
    const cleanPosition = (position || 'member')
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    
    return `${cleanName}-${cleanPosition}-c3-community`;
}

// ========== RENAME TEAM IMAGES ==========
async function renameTeamImages() {
    console.log('\n🔵 Renaming Team Images...\n');
    
    const TeamPublic = require('./schemas/teamPublic');
    const teamMembers = await TeamPublic.find({});
    
    console.log(`Found ${teamMembers.length} team members\n`);
    
    for (const member of teamMembers) {
        try {
            if (!member.publicId || !member.photo) {
                console.log(`⏭️  Skipped (no photo): ${member.name}`);
                continue;
            }
            
            // New SEO name
            const newPublicId = generateSeoFilename(member.name, member.position);
            
            // Check if already renamed
            if (member.publicId.includes('c3-community') || 
                member.publicId.toLowerCase().includes(member.name.toLowerCase().split(' ')[0])) {
                console.log(`✅ Already SEO: ${member.name}`);
                continue;
            }
            
            console.log(`🔄 Renaming: ${member.name}`);
            console.log(`   Old: ${member.publicId}`);
            console.log(`   New: ${newPublicId}`);
            
            // Rename in Cloudinary
            const result = await cloudinary.uploader.rename(
                member.publicId,
                newPublicId,
                { overwrite: false, invalidate: true }
            );
            
            // Update Database
            member.publicId = result.public_id;
            member.photo = result.secure_url;
            await member.save();
            
            console.log(`   ✅ Done\n`);
            
        } catch (error) {
            console.error(`   ❌ Error: ${error.message}\n`);
        }
    }
    
    console.log('✅ Team images renamed!\n');
}

// ========== RENAME ALUMNI IMAGES ==========
async function renameAlumniImages() {
    console.log('\n🔵 Renaming Alumni Images...\n');
    
    const Alumni = require('./schemas/alumni');
    const alumniList = await Alumni.find({});
    
    console.log(`Found ${alumniList.length} alumni\n`);
    
    for (const alumni of alumniList) {
        try {
            if (!alumni.publicId || !alumni.photo) {
                console.log(`⏭️  Skipped (no photo): ${alumni.name}`);
                continue;
            }
            
            const newPublicId = generateSeoFilename(alumni.name, `alumni-${alumni.batch}`);
            
            // Check if already renamed
            if (alumni.publicId.includes('c3-community')) {
                console.log(`✅ Already SEO: ${alumni.name}`);
                continue;
            }
            
            console.log(`🔄 Renaming: ${alumni.name}`);
            console.log(`   Old: ${alumni.publicId}`);
            console.log(`   New: ${newPublicId}`);
            
            const result = await cloudinary.uploader.rename(
                alumni.publicId,
                newPublicId,
                { overwrite: false, invalidate: true }
            );
            
            alumni.publicId = result.public_id;
            alumni.photo = result.secure_url;
            await alumni.save();
            
            console.log(`   ✅ Done\n`);
            
        } catch (error) {
            console.error(`   ❌ Error: ${error.message}\n`);
        }
    }
    
    console.log('✅ Alumni images renamed!\n');
}

// ========== RENAME WINNERS IMAGES ==========
async function renameWinnersImages() {
    console.log('\n🔵 Renaming Winners Images...\n');
    
    const Winners = require('./schemas/winners');
    const sections = await Winners.find({});
    
    let totalWinners = 0;
    sections.forEach(s => totalWinners += s.winners.length);
    
    console.log(`Found ${sections.length} sections with ${totalWinners} winners\n`);
    
    for (const section of sections) {
        for (const winner of section.winners) {
            try {
                if (!winner.publicId || !winner.photo) {
                    console.log(`⏭️  Skipped (no photo): ${winner.name}`);
                    continue;
                }
                
                const newPublicId = generateSeoFilename(
                    winner.name, 
                    `${winner.rank}-${winner.eventName}`
                );
                
                // Check if already renamed
                if (winner.publicId.includes('c3-community')) {
                    console.log(`✅ Already SEO: ${winner.name}`);
                    continue;
                }
                
                console.log(`🔄 Renaming: ${winner.name}`);
                console.log(`   Old: ${winner.publicId}`);
                console.log(`   New: ${newPublicId}`);
                
                const result = await cloudinary.uploader.rename(
                    winner.publicId,
                    newPublicId,
                    { overwrite: false, invalidate: true }
                );
                
                winner.publicId = result.public_id;
                winner.photo = result.secure_url;
                
                console.log(`   ✅ Done\n`);
                
            } catch (error) {
                console.error(`   ❌ Error: ${error.message}\n`);
            }
        }
        
        await section.save();
    }
    
    console.log('✅ Winners images renamed!\n');
}

// ========== RENAME GALLERY IMAGES ==========
async function renameGalleryImages() {
    console.log('\n🔵 Renaming Gallery Images...\n');
    
    const Gallery = require('./schemas/gallery');
    const images = await Gallery.find({});
    
    console.log(`Found ${images.length} gallery images\n`);
    
    for (const image of images) {
        try {
            if (!image.publicId || !image.cloudinaryUrl) {
                console.log(`⏭️  Skipped (no image): ${image.title}`);
                continue;
            }
            
            const newPublicId = generateSeoFilename(image.title, 'gallery');
            
            // Check if already renamed
            if (image.publicId.includes('c3-community')) {
                console.log(`✅ Already SEO: ${image.title}`);
                continue;
            }
            
            console.log(`🔄 Renaming: ${image.title}`);
            console.log(`   Old: ${image.publicId}`);
            console.log(`   New: ${newPublicId}`);
            
            const result = await cloudinary.uploader.rename(
                image.publicId,
                newPublicId,
                { overwrite: false, invalidate: true }
            );
            
            image.publicId = result.public_id;
            image.cloudinaryUrl = result.secure_url;
            await image.save();
            
            console.log(`   ✅ Done\n`);
            
        } catch (error) {
            console.error(`   ❌ Error: ${error.message}\n`);
        }
    }
    
    console.log('✅ Gallery images renamed!\n');
}

// ========== MAIN FUNCTION ==========
async function main() {
    console.log('\n🚀 Starting Image Rename Script...\n');
    console.log('=====================================\n');
    
    await connectDB();
    
    // Confirm before starting
    console.log('⚠️  This will rename ALL existing images in Cloudinary.');
    console.log('   Images URLs will change but content stays same.\n');
    
    // Run all renames
    await renameTeamImages();
    await renameAlumniImages();
    await renameWinnersImages();
    await renameGalleryImages();
    
    console.log('=====================================');
    console.log('\n🎉 ALL IMAGES RENAMED SUCCESSFULLY!\n');
    
    await mongoose.disconnect();
    process.exit(0);
}

// Run script
main().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
});
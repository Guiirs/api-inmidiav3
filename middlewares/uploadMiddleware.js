// middlewares/uploadMiddleware.js
const multer = require('multer');
const path = require('path');

// Configuração do armazenamento
const storage = multer.diskStorage({
    // Define a pasta de destino para os uploads
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    // Define o nome do ficheiro para evitar colisões de nomes
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Filtro para aceitar apenas imagens
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
        return cb(null, true);
    }
    cb(new Error('Apenas ficheiros de imagem são permitidos (jpeg, jpg, png, gif).'));
};

// Inicializa o multer com a configuração de armazenamento e o filtro de ficheiros
const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 1024 * 1024 * 5 } // Limite de 5MB por ficheiro
});

module.exports = upload;
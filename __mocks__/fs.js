const fs = jest.genMockFromModule('fs');

const writeFile = jest.fn().mockImplementation((file, data, cb) => cb(null, data));

fs.writeFile = writeFile;

module.exports = fs;

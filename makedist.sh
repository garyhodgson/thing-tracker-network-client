# Packages the app into a windows binary.

if [ ! -d "dist" ]; then
    echo "This script expects a dist directory which contains the node-webkit files for packaging to exist."
    echo "See also: https://github.com/rogerwang/node-webkit/wiki/How-to-package-and-distribute-your-apps"
    echo ""
    echo "Aborting."
    exit -1
fi

zip -r dist/ttn-client.nw index.html js css img node_modules package.json README.md data bin
cat dist/nw.exe dist/ttn-client.nw > dist/ttn-client.exe
chmod +x dist/ttn-client.exe
cd dist
zip -r ttn-client-distribution.zip ttn-client.exe *.dll nw.pak
cd ..
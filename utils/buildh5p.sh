#!/bin/sh
build_test(){	
		if ! [ -d $IPATH ]; then
			return 0
		fi
		if [ $(find $IPATH -name "*.zip" -printf . | wc -c) -lt "1" ]; then
			return 0
		fi
		#GITHUB_WORKSPACE=$(pwd)
		cd $IPATH && export FOLDER=${PWD##*/} && cd $GITHUB_WORKSPACE
		echo $FOLDER
		echo $IPATH
		rm -r ./ee/ee/public/items/*
		cp -a ${IPATH}. ./ee/ee/public/items/
		# npm install --prefix ./ee/ee
		# export REPONAME="${GITHUB_REPOSITORY#*/}"
		sed -i 's@"homepage": ".*"@"homepage": "./"@' ./ee/ee/package.json
		cd ./ee/ee && npm run build
		find ./build/ -name *.map -exec rm {} \;
		cd $GITHUB_WORKSPACE
		

		###### github pages
		sed -i 's@"homepage": ".*"@"homepage": "/'"$REPONAME"'/'"$FOLDER"'/"@' ./ee/ee/package.json
		(cd ./ee/ee && npm run build)
		cp -a ./ee/ee/build/. ./public/${FOLDER}/
		npx playwright screenshot --wait-for-timeout 2000 --viewport-size 1024,768 "http://127.0.0.1:8080/${REPONAME}/${FOLDER}" ./public/${FOLDER}.png
		cp ${FOLDER}.png ./public/
		
		if [ $i -gt "0" ]; then
			echo -n ',' >> data.json
		fi		
		echo -n '{"url": "https://'"${GITHUB_REPOSITORY_OWNER}"'.github.io/'"${REPONAME}"'/'"${FOLDER}"'","screenshot": "./'"${FOLDER}"'.png","title": "'"${FOLDER}"'"}' >> data.json

		tar -cvf ${FOLDER}.tar *.zip
		export i=$((i+1))
		return 1
}

if [ $(find ./items/items/* -maxdepth 0 -type d -printf . | wc -c) -ge "1" ]; then
	live-server --open="./public/" --proxy=/${REPONAME}:http://127.0.0.1:8080/public --no-browser &
	export i=0
	echo -n '{"tests": [' > data.json

	for IPATH in $( ls -d items/items/*/ )
	do
		build_test
	done

	echo -n ']}' >> data.json
	npx ejs ./items/scripts/index.ejs -f ./data.json -o ./public/index.html
	cp ./data.json ./public/
fi
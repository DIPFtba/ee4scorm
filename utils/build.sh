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

		rm -r ./ee/public/items/*
		cp -a ${IPATH}. ./ee/public/items/
		cd ./ee && npm run build
		find ./build/ -name *.map -exec rm {} \;
		cd $GITHUB_WORKSPACE
		
		export ZIPNAME="SCORM12_${FOLDER}_$(date '+%d-%m-%Y-%H:%M')"
		mkdir $ZIPNAME
		#pushd ./ee4scorm/ee && npm run build && popd
		cp -a ./ee/SCORM_wrapper/1_2/. ./${ZIPNAME}/
		cp -a ./ee/build/. ./${ZIPNAME}/public/ee/
		cd ./${ZIPNAME} && zip -r  "../${ZIPNAME}.zip" *
		cd $GITHUB_WORKSPACE
		
		export i=$((i+1))
		return 1
}

if [ $(find ./items/items/* -maxdepth 0 -type d -printf . | wc -c) -ge "1" ]; then
	export i=0
	for IPATH in $( ls -d items/items/*/ )
	do
		build_test
	done
fi
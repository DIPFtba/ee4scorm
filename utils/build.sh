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
		
		for WRAPPER_PATH in $( ls -d ./ee/SCORM_wrapper/*/ )
		do
			cd $WRAPPER_PATH && export SCORMPATH=${PWD##*/} && cd $BASEPATH
			export ZIPNAME="SCORM_${SCORMPATH}_${FOLDER}_$(date '+%d-%m-%Y-%H:%M')"
			mkdir $ZIPNAME
			cp -a ./ee/SCORM_wrapper/${SCORMPATH}/. ./${ZIPNAME}/
			cp -a ./ee/build/. ./${ZIPNAME}/public/ee/
			cd ./${ZIPNAME} && zip -r  "../${ZIPNAME}.zip" *
			cd $GITHUB_WORKSPACE
		done
		
		return 1
}

if [ $(find ./items/items/* -maxdepth 0 -type d -printf . | wc -c) -ge "1" ]; then
	for IPATH in $( ls -d items/items/*/ )
	do
		build_test
	done
	exit 0
fi
/*------------------------------------------------------------------------------
* Copyright (C) 2003-2006 Ben van Klinken and the CLucene Team
* Copyright 2025 superstruct ltd, New Zealand
* 
* Distributable under the terms of either the Apache License (Version 2.0) or 
* the GNU Lesser General Public License, as specified in the COPYING file.
------------------------------------------------------------------------------*/
#ifndef _config_threads_h
#define _config_threads_h

#ifndef _CL_DISABLE_MULTITHREADING
	#if defined(_LUCENE_DONTIMPLEMENT_THREADMUTEX)
		//do nothing
	#elif defined(__EMSCRIPTEN__)
		// WASM: Use Emscripten pthreads only
		#include <pthread.h>
		#define _CL_HAVE_PTHREAD
	#elif defined(_CL_HAVE_PTHREAD)
		#include <pthread.h>
	#endif
#endif

CL_NS_DEF(util)

#ifndef _CL_DISABLE_MULTITHREADING

#if defined(_LUCENE_DONTIMPLEMENT_THREADMUTEX)
	// No threading implementation
#elif defined(_CL_HAVE_PTHREAD)
	class CLuceneThreadIdCompare
	{
	public:
		enum
		{	// parameters for hash table
			bucket_size = 4,	// 0 < bucket_size
			min_buckets = 8
		};	// min_buckets = 2 ^^ N, 0 < N

		bool operator()( pthread_t t1, pthread_t t2 ) const{
			//pthread_equal should be used, but it returns only non-zero if equal, so we can't use it for order compare
			return t1 < t2;
		}
	};
#endif

#endif //_CL_DISABLE_MULTITHREADING

CL_NS_END
#endif
from django.conf.urls.defaults import *

urlpatterns = patterns('jetpack.views',
	url(r'^gallery/$', 'gallery', name='gallery'),

	url(r'^create_xpi/$', 'createXPI', name='jp_create_xpi'),
	url(r'^get_xpi/(?P<hash>.*)/(?P<slug>.*)/$', 'getXPI', name='jp_get_xpi'),

    url(r'^ext_(?P<slug>.*)/v_(?P<version>.*)\.(?P<counter>\d+)/$',
		'jetpack_version_edit', name='jp_jetpack_version_edit'),
    url(r'^mod_(?P<slug>.*)/v_(?P<version>.*)\.(?P<counter>\d+)/$',
		'capability_version_edit', name='jp_capability_version_edit'),

	url(r'^ext_(?P<slug>.*)/version_create/$', 
		'item_version_create', {"type": "jetpack"}, name='jp_jetpack_version_create'),
	url(r'^mod_(?P<slug>.*)/version_create/$', 
		'item_version_create', {"type": "capability"}, name='jp_capability_version_create'),

	url(r'^ext_(?P<slug>.*)/v_(?P<version>.*)\.(?P<counter>\d+)/update/$', 
		'item_version_update', {"type": "jetpack"}, name='jp_jetpack_version_update'),
	url(r'^mod_(?P<slug>.*)/v_(?P<version>.*)\.(?P<counter>\d+)/update/$', 
		'item_version_update', {"type": "capability"}, name='jp_capability_version_update'),

	url(r'^ext_(?P<slug>.*)/update/$', 
		'item_update', {"type": "jetpack"}, name='jp_jetpack_update'),
	url(r'^mod_(?P<slug>.*)/update/$', 
		'item_update', {"type": "capability"}, name='jp_capability_update'),

	url(r'^ext_(?P<slug>.*)/v_(?P<version>.*)\.(?P<counter>\d+)/add_dependency/$',
		'add_dependency', {'type': 'jetpack'}, name='jp_jetpack_add_dependency'),
	url(r'^mod_(?P<slug>.*)/v_(?P<version>.*)\.(?P<counter>\d+)/add_dependency/$',
		'add_dependency', {'type': 'capability'}, name='jp_capability_add_dependency'),

	url(r'^ext_(?P<slug>.*)/v_(?P<version>.*)\.(?P<counter>\d+)/remove_dependency/(?P<d_slug>.*)/(?P<d_version>.*)/(?P<d_counter>\d+)/$',
		'remove_dependency', {'type': 'jetpack'}, name='jp_jetpack_remove_dependency'),
	url(r'^cap_(?P<slug>.*)/v_(?P<version>.*)\.(?P<counter>\d+)/remove_dependency/(?P<d_slug>.*)/(?P<d_version>.*)/(?P<d_counter>\d+)/$',
		'remove_dependency', {'type': 'capability'}, name='jp_capability_remove_dependency'),

	url(r'^ext_(?P<slug>.*)/v_(?P<version>.*)\.(?P<counter>\d+)/save_as_base/$', 
		'item_version_save_as_base', {'type': 'jetpack'}, 
		name='jp_jetpack_version_save_as_base'),
	url(r'^mod_(?P<slug>.*)/v_(?P<version>.*)\.(?P<counter>\d+)/save_as_base/$', 
		'item_version_save_as_base', {"type": "capability"}, 
		name='jp_capability_version_save_as_base'),

	url(r'^ext/create',
		'item_create', {"type": "jetpack"}, name='jp_jetpack_create'),
	url(r'^cap/create',
		'item_create', {"type": "capability"}, name='jp_capability_create'),

    url(r'^ext_(?P<slug>.*)/$',
		'jetpack_edit', name='jp_jetpack_edit'),
    url(r'^mod_(?P<slug>.*)/$',
		'capability_edit', name='jp_capability_edit'),
)


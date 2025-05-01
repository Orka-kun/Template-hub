--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Access; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public."Access" (
    template_id integer NOT NULL,
    user_id integer NOT NULL
);


ALTER TABLE public."Access" OWNER TO "user";

--
-- Name: Answer; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public."Answer" (
    id integer NOT NULL,
    form_id integer NOT NULL,
    question_id integer NOT NULL,
    value text NOT NULL
);


ALTER TABLE public."Answer" OWNER TO "user";

--
-- Name: Answer_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public."Answer_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Answer_id_seq" OWNER TO "user";

--
-- Name: Answer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public."Answer_id_seq" OWNED BY public."Answer".id;


--
-- Name: Comment; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public."Comment" (
    id integer NOT NULL,
    template_id integer NOT NULL,
    user_id integer NOT NULL,
    content text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Comment" OWNER TO "user";

--
-- Name: Comment_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public."Comment_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Comment_id_seq" OWNER TO "user";

--
-- Name: Comment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public."Comment_id_seq" OWNED BY public."Comment".id;


--
-- Name: Form; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public."Form" (
    id integer NOT NULL,
    template_id integer NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Form" OWNER TO "user";

--
-- Name: Form_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public."Form_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Form_id_seq" OWNER TO "user";

--
-- Name: Form_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public."Form_id_seq" OWNED BY public."Form".id;


--
-- Name: Like; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public."Like" (
    template_id integer NOT NULL,
    user_id integer NOT NULL
);


ALTER TABLE public."Like" OWNER TO "user";

--
-- Name: Notification; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public."Notification" (
    id integer NOT NULL,
    user_id integer NOT NULL,
    message text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    read boolean DEFAULT false NOT NULL
);


ALTER TABLE public."Notification" OWNER TO "user";

--
-- Name: Notification_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public."Notification_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Notification_id_seq" OWNER TO "user";

--
-- Name: Notification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public."Notification_id_seq" OWNED BY public."Notification".id;


--
-- Name: Question; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public."Question" (
    id integer NOT NULL,
    template_id integer NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    description text,
    is_shown_in_table boolean DEFAULT false NOT NULL,
    "order" integer NOT NULL,
    fixed boolean DEFAULT false NOT NULL
);


ALTER TABLE public."Question" OWNER TO "user";

--
-- Name: Question_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public."Question_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Question_id_seq" OWNER TO "user";

--
-- Name: Question_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public."Question_id_seq" OWNED BY public."Question".id;


--
-- Name: Tag; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public."Tag" (
    id integer NOT NULL,
    name text NOT NULL
);


ALTER TABLE public."Tag" OWNER TO "user";

--
-- Name: Tag_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public."Tag_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Tag_id_seq" OWNER TO "user";

--
-- Name: Tag_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public."Tag_id_seq" OWNED BY public."Tag".id;


--
-- Name: Template; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public."Template" (
    id integer NOT NULL,
    title text NOT NULL,
    description text,
    topic text,
    image_url text,
    is_public boolean DEFAULT false NOT NULL,
    created_by integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Template" OWNER TO "user";

--
-- Name: TemplateTag; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public."TemplateTag" (
    template_id integer NOT NULL,
    tag_id integer NOT NULL
);


ALTER TABLE public."TemplateTag" OWNER TO "user";

--
-- Name: Template_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public."Template_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Template_id_seq" OWNER TO "user";

--
-- Name: Template_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public."Template_id_seq" OWNED BY public."Template".id;


--
-- Name: User; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public."User" (
    id integer NOT NULL,
    name text,
    email text NOT NULL,
    password text NOT NULL,
    is_admin boolean DEFAULT false NOT NULL
);


ALTER TABLE public."User" OWNER TO "user";

--
-- Name: User_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."User_id_seq" OWNER TO "user";

--
-- Name: User_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public."User_id_seq" OWNED BY public."User".id;


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO "user";

--
-- Name: Answer id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."Answer" ALTER COLUMN id SET DEFAULT nextval('public."Answer_id_seq"'::regclass);


--
-- Name: Comment id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."Comment" ALTER COLUMN id SET DEFAULT nextval('public."Comment_id_seq"'::regclass);


--
-- Name: Form id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."Form" ALTER COLUMN id SET DEFAULT nextval('public."Form_id_seq"'::regclass);


--
-- Name: Notification id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."Notification" ALTER COLUMN id SET DEFAULT nextval('public."Notification_id_seq"'::regclass);


--
-- Name: Question id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."Question" ALTER COLUMN id SET DEFAULT nextval('public."Question_id_seq"'::regclass);


--
-- Name: Tag id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."Tag" ALTER COLUMN id SET DEFAULT nextval('public."Tag_id_seq"'::regclass);


--
-- Name: Template id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."Template" ALTER COLUMN id SET DEFAULT nextval('public."Template_id_seq"'::regclass);


--
-- Name: User id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."User" ALTER COLUMN id SET DEFAULT nextval('public."User_id_seq"'::regclass);


--
-- Data for Name: Access; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public."Access" (template_id, user_id) FROM stdin;
\.


--
-- Data for Name: Answer; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public."Answer" (id, form_id, question_id, value) FROM stdin;
11	10	14	Gojo Satoru
12	11	18	,
13	12	14	Satoru
\.


--
-- Data for Name: Comment; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public."Comment" (id, template_id, user_id, content, created_at) FROM stdin;
10	31	1	Comment1	2025-04-20 21:20:59.488
11	32	6	c	2025-04-21 20:02:14.642
\.


--
-- Data for Name: Form; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public."Form" (id, template_id, user_id, created_at) FROM stdin;
10	31	1	2025-04-20 21:21:02.087
11	32	6	2025-04-21 20:03:20.722
12	31	6	2025-04-21 20:11:51.469
\.


--
-- Data for Name: Like; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public."Like" (template_id, user_id) FROM stdin;
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public."Notification" (id, user_id, message, created_at, read) FROM stdin;
1	6	Gojo shared the template "Test1 Gojo" with you	2025-04-20 21:21:27.735	f
2	1	Mikasa submitted a form for your template "Test1 Gojo" (ID: 12)	2025-04-21 20:11:51.472	f
\.


--
-- Data for Name: Question; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public."Question" (id, template_id, type, title, description, is_shown_in_table, "order", fixed) FROM stdin;
14	31	text	Gojo's full name?		f	0	f
18	32	text	.		f	1	f
\.


--
-- Data for Name: Tag; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public."Tag" (id, name) FROM stdin;
1	Test
2	Testing1
3	MikasaTags
\.


--
-- Data for Name: Template; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public."Template" (id, title, description, topic, image_url, is_public, created_by, created_at) FROM stdin;
31	Test1 Gojo	Description	Other	\N	t	1	2025-04-20 21:19:45.678
32	Test1 Mikasa	Mikasa Description	Other	\N	t	6	2025-04-21 19:58:45.942
\.


--
-- Data for Name: TemplateTag; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public."TemplateTag" (template_id, tag_id) FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public."User" (id, name, email, password, is_admin) FROM stdin;
1	Gojo	gojo@gmail.com	$2b$10$N43uWcKJlTKCud5g85Q8v.OJhlpCEhAWKHb5kXnvYWv/bzPyKnkvq	f
3	Sukuna	sukuna@gmail.com	$2b$10$pFBmRPk7xj1KK4YD.Qog5.iAPjF9kmDK7xvm.Xoiod1.ZJ/RZlwEq	f
5	Levi	levi@gmail.com	$2b$10$yIUJcu3KA23k4504J1DfPecB4BshzHpQl0.m8V5IB4njrWVNFn/Li	f
6	Mikasa	mikasa@gmail.com	$2b$10$Pc/sFFTpofkEJIrYTYCkYuKOv7bnSStBMIdF80cELC3GJpKTe5hdq	f
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
cebeea77-8f41-4ff7-8420-7fa6fe5fd3ed	0242a3ce2f0381c8de4bfbfef9331980bf8cac1e9bc4ca8d981bf7be40548e2d	2025-04-11 20:37:09.204804+06	20250405175541_init	\N	\N	2025-04-11 20:37:09.169377+06	1
636e4084-78ad-40cd-bd2d-029b0e501aa2	8139d9f765841420fe914d2c2428b5414545cd777c67bc9ebeb505c542701e35	2025-04-11 20:37:09.210411+06	20250407212613_add_notifications	\N	\N	2025-04-11 20:37:09.205213+06	1
66615114-86db-4c33-ade3-ccdd933895b7	046df702c1f18075f96fcf3b90cd6158a1825c5a7da8a738218a1cd4549d9fc1	2025-04-21 03:15:56.52131+06	20250420211556_add_cascade_to_relations	\N	\N	2025-04-21 03:15:56.507669+06	1
4b02fd3e-9f43-458f-8ef0-d3ceb2c4aa4b	824bd024b209a61247f0aabc1399b64eadee744a02a1db01bf4718eb9cce2429	2025-04-23 02:49:55.664552+06	20250422204847_add_search_vector	\N	\N	2025-04-23 02:49:55.633704+06	1
9ee532ed-ba93-454e-ae7b-6d1e44632859	7e867d0bc81fa30c94af31985bceb2c3819c6904d5827e720b24e0865d140acd	2025-04-23 02:50:18.764419+06	20250422205018_added_search_vector	\N	\N	2025-04-23 02:50:18.763062+06	1
3050929d-cffe-411e-9bec-10d4ea77541d	4e28bfa41f261059546f4e7acf5b16ed8f80f1f38c7ad139a8df866834fb94ce	2025-04-23 23:30:26.020866+06	20250423172857_add_search_vector	\N	\N	2025-04-23 23:30:26.01701+06	1
369e5a82-5eeb-4295-a3f4-4df681913906	7e867d0bc81fa30c94af31985bceb2c3819c6904d5827e720b24e0865d140acd	2025-04-23 23:31:32.230962+06	20250423173132_empty_migration_sql	\N	\N	2025-04-23 23:31:32.228706+06	1
dd80b1cc-5521-4e8f-bddb-2893fdd19214	4e28bfa41f261059546f4e7acf5b16ed8f80f1f38c7ad139a8df866834fb94ce	2025-04-23 23:51:06.027284+06	20250423175032_add_search_vector	\N	\N	2025-04-23 23:51:06.02501+06	1
a081c5f8-e534-4abd-89ce-68c3210ca86a	7e867d0bc81fa30c94af31985bceb2c3819c6904d5827e720b24e0865d140acd	2025-04-23 23:51:06.791115+06	20250423175106_	\N	\N	2025-04-23 23:51:06.789395+06	1
\.


--
-- Name: Answer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public."Answer_id_seq"', 13, true);


--
-- Name: Comment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public."Comment_id_seq"', 11, true);


--
-- Name: Form_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public."Form_id_seq"', 12, true);


--
-- Name: Notification_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public."Notification_id_seq"', 2, true);


--
-- Name: Question_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public."Question_id_seq"', 18, true);


--
-- Name: Tag_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public."Tag_id_seq"', 3, true);


--
-- Name: Template_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public."Template_id_seq"', 32, true);


--
-- Name: User_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public."User_id_seq"', 6, true);


--
-- Name: Access Access_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."Access"
    ADD CONSTRAINT "Access_pkey" PRIMARY KEY (template_id, user_id);


--
-- Name: Answer Answer_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."Answer"
    ADD CONSTRAINT "Answer_pkey" PRIMARY KEY (id);


--
-- Name: Comment Comment_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_pkey" PRIMARY KEY (id);


--
-- Name: Form Form_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."Form"
    ADD CONSTRAINT "Form_pkey" PRIMARY KEY (id);


--
-- Name: Like Like_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."Like"
    ADD CONSTRAINT "Like_pkey" PRIMARY KEY (template_id, user_id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: Question Question_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."Question"
    ADD CONSTRAINT "Question_pkey" PRIMARY KEY (id);


--
-- Name: Tag Tag_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."Tag"
    ADD CONSTRAINT "Tag_pkey" PRIMARY KEY (id);


--
-- Name: TemplateTag TemplateTag_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."TemplateTag"
    ADD CONSTRAINT "TemplateTag_pkey" PRIMARY KEY (template_id, tag_id);


--
-- Name: Template Template_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."Template"
    ADD CONSTRAINT "Template_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Tag_name_key; Type: INDEX; Schema: public; Owner: user
--

CREATE UNIQUE INDEX "Tag_name_key" ON public."Tag" USING btree (name);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: user
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: Access Access_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."Access"
    ADD CONSTRAINT "Access_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public."Template"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Access Access_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."Access"
    ADD CONSTRAINT "Access_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Answer Answer_form_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."Answer"
    ADD CONSTRAINT "Answer_form_id_fkey" FOREIGN KEY (form_id) REFERENCES public."Form"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Answer Answer_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."Answer"
    ADD CONSTRAINT "Answer_question_id_fkey" FOREIGN KEY (question_id) REFERENCES public."Question"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Comment Comment_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public."Template"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Comment Comment_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Form Form_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."Form"
    ADD CONSTRAINT "Form_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public."Template"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Form Form_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."Form"
    ADD CONSTRAINT "Form_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Like Like_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."Like"
    ADD CONSTRAINT "Like_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public."Template"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Like Like_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."Like"
    ADD CONSTRAINT "Like_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Notification Notification_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Question Question_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."Question"
    ADD CONSTRAINT "Question_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public."Template"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TemplateTag TemplateTag_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."TemplateTag"
    ADD CONSTRAINT "TemplateTag_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES public."Tag"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TemplateTag TemplateTag_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."TemplateTag"
    ADD CONSTRAINT "TemplateTag_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public."Template"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Template Template_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public."Template"
    ADD CONSTRAINT "Template_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO "user";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO myuser;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO "user";
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO user2;


--
-- PostgreSQL database dump complete
--

